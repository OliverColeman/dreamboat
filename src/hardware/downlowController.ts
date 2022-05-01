// In electron we may need to use window.require because https://stackoverflow.com/a/43971252/1133481
// So we need to import the SerialPort type and SerialPort class separately.
import _ from 'lodash'
import SerialPort from 'serialport'
import { DownLowTelemetry, DownlowWheelTelemetry } from '../model/types'
import { downlowTelemetryUpdateInterval, usbBaudRate, usbGetRetryTimeout, usbMaxGetAttempts, wheelCount } from '../settings'
import { normaliseAngle, normaliseValueToRange } from '../util'
let SerialPortClass:typeof SerialPort
try {
  // In electron window.require should be used.
  SerialPortClass = window.require('serialport')
} catch (e) {
  SerialPortClass = require('serialport')
}

enum Command {
  Set = 83, // 'S'
  Get = 71, // 'G'
}

class DownLow {
  private serial: SerialPort
  private lastError: Error = null

  constructor () {
    this.connect()
  }

  /** Attempt to connect to the MCU. Retries connecting if the connection fails. */
  private async connect () {
    const devices:SerialPort.PortInfo[] = (await SerialPortClass.list()).filter(port => port.pnpId?.startsWith('usb-Dimension_Engineering_Sabertooth'))
    if (devices.length === 0) throw Error('Could not find downlow MCU')

    this.serial = new SerialPortClass(devices[0].path, {
      baudRate: usbBaudRate,
      autoOpen: false,
    })

    // eslint-disable-next-line no-undef
    let connectIntervalHandle:NodeJS.Timeout

    const connect = () => {
      // Attempt to connect once per second.
      connectIntervalHandle = setInterval(
        () => this.serial.open(),
        1000
      )
    }

    // When a connection is established, cancel the connection attempt function.
    this.serial.on('open', () => {
      if (connectIntervalHandle) {
        clearInterval(connectIntervalHandle)
        connectIntervalHandle = null
        this.lastError = null
      }
    })

    this.serial.on('error', (err) => {
      this.lastError = err
    })

    this.serial.on('close', (err) => {
      this.lastError = err
      connect()
    })

    connect()
  }

  /** Returns true iff the USB serial connection is open and working. */
  isConnected = () => this.serial.isOpen

  /** Get the last error that occurred in the connection. */
  getLastError = () => this.lastError

  /** Get telemetry from the downlow MCU. */
  get () {
    return new Promise<DownlowWheelTelemetry[]>((resolve, reject) => {
      let attemptCount = 0
      // eslint-disable-next-line no-undef
      let timeoutHandle:NodeJS.Timeout

      const attemptRequest = () => {
        attemptCount += 1

        this.send([Command.Get])

        // If timeout enabled.
        if (usbGetRetryTimeout > 0) {
          timeoutHandle = setTimeout(() => {
            console.warn(`Downlow get request timed out after ${attemptCount} attempts`)

            if (attemptCount === usbMaxGetAttempts) {
              console.error('Downlow aborting get request')
              this.serial.removeListener('data', dataListener)
              reject(Error('Downlow get request timed out'))
            } else {
              console.warn('Downlow retrying get request')
              // Try again...
              attemptRequest()
            }
          }, usbGetRetryTimeout)
        }
      }

      const dataListener = (data:Buffer) => {
        clearTimeout(timeoutHandle)
        this.serial.removeListener('data', dataListener)

        let dataIdx = 0

        const wheels:DownlowWheelTelemetry[] = _.range(wheelCount).map(() => ({
          ready: false,
          angle: 0,
          steeringRate: 0,
          stuckTime: 0,
          steeringCurrent: 0,
          driveCurrent: 0,
        }))

        for (let wi = 0; wi < wheelCount; wi++) {
          // 2 bytes to represent current angle of wheel, in range [0-65535].
          const shortVal = data[dataIdx++] << 8 | data[dataIdx++]
          const unitAngle = shortVal / 65535.0
          wheels[wi].angle = normaliseAngle(unitAngle * 2 * Math.PI)

          // 1 byte to represent rate the steering motor is being driven at.
          wheels[wi].steeringRate = (data[dataIdx++] - 127) / 127

          // 1 byte to represent time wheel has been stuck, in tenths of a second.
          wheels[wi].stuckTime = data[dataIdx++] * 0.1

          // 1 byte to represent the current being drawn by the steering motor, in halves of an amp.
          wheels[wi].steeringCurrent = (data[dataIdx++] - 127) * 0.5

          // 1 byte to represent the current being drawn by the drive motor, in halves of an amp.
          wheels[wi].driveCurrent = (data[dataIdx++] - 127) * 0.5
        }

        // 1 byte for wheel ready flags, bit format [ x x x x w3 w2 w1 w0 ]
        for (let wi = 0; wi < wheelCount; wi++) {
          wheels[wi].ready = !!((data[dataIdx] >> wi) & 0x01)
        }

        resolve(wheels)
      }

      this.serial.on('data', dataListener)

      attemptRequest()
    })
  }

  /** Send new wheel angles to the downlow MCU. */
  setWheelAngles (wheelAngles:number[]) {
    const data = [Command.Set]
    for (let wi = 0; wi < wheelCount; wi++) {
      const normalisedTo360 = normaliseValueToRange(0, wheelAngles[wi], 360)
      const shortVal = Math.round(normalisedTo360 / 360 * 65535)
      data.push((shortVal >> 8) & 0xff)
      data.push((shortVal >> 0) & 0xff)
    }
    this.send(data)
  }

  private send (data:number[]) {
    this.serial.write(Buffer.from(data))
  }
}

/**
 * Handles communication with the microcontroller unit (MCU) located under the vehicle.
 * This MCU controls the steering motors for each wheel, and provides associated telemetry.
 * In future it may provide for other things, such as lights and collision avoidance sensors.
 */
export const downlowController = new DownLow()

let wheelTelemetry:DownlowWheelTelemetry[] = _.range(wheelCount).map(() => ({
  ready: false,
  angle: 0,
  steeringRate: 0,
  stuckTime: 0,
  steeringCurrent: 0,
  driveCurrent: 0,
}))

export const getDownlowWheelTelemetry = () => _.cloneDeep(wheelTelemetry)

export const getDownlowTelemetry = ():DownLowTelemetry => ({
  isConnected: downlowController.isConnected(),
  error: '' + downlowController.getLastError(),
})

// Periodically updates the internal mutable telemetry.
const updateTelemetry = async () => {
  const updateStarted = Date.now()

  if (downlowController.isConnected()) {
    try {
      wheelTelemetry = await downlowController.get()
    } catch (err) { }
  }

  // Update no more frequently than motorControllerStateUpdateInterval
  // This allows for the update taking longer than the desired interval.
  setTimeout(updateTelemetry, Math.max(1, downlowTelemetryUpdateInterval - (Date.now() - updateStarted)))
}

// Start process to periodically update motor controller state and stats.
updateTelemetry()
