// In electron we may need to use window.require because https://stackoverflow.com/a/43971252/1133481
// So we need to import the SerialPort type and SerialPort class separately.
import _ from 'lodash'
import SerialPort from 'serialport'
import { DownLowTelemetry, WheelState, WheelTelemetry } from '../model/types'
import { downlowMcuSerialNumber, downlowTelemetryUpdateInterval, maxVehicleSpeed, usbBaudRate, usbGetRetryTimeout, usbMaxGetAttempts, wheelCount } from '../settings'
import { normaliseAngle, normaliseValueToRange, rad2Deg } from '../util'
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

const getWheelTelemetryTemplate = ():WheelTelemetry => ({
  ready: false,
  angle: 0,
  driveRate: 0,
  steeringRate: 0,
  stuckTime: 0,
  // driveOutputTemperature: 0,
  steeringCurrent: 0,
  driveCurrent: 0,
  steeringMotorControllerFault: false,
})

class DownLow {
  private serial: SerialPort
  private lastError: Error = null

  constructor () {
    this.connect()
  }

  /** Attempt to connect to the MCU. Retries connecting if the connection fails. */
  private async connect () {
    const devices:SerialPort.PortInfo[] = (await SerialPortClass.list()).filter(port => port.serialNumber === downlowMcuSerialNumber)
    if (devices.length === 0) {
      this.lastError = Error('Could not find downlow MCU')
      return
    }

    this.serial = new SerialPortClass(devices[0].path, {
      baudRate: usbBaudRate,
      autoOpen: false,
    })

    // eslint-disable-next-line no-undef
    let connectIntervalHandle:NodeJS.Timeout

    const connectSerial = () => {
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
      connectSerial()
    })

    connectSerial()
  }

  /** Returns true iff the USB serial connection is open and working. */
  isConnected = () => !!this.serial && this.serial.isOpen

  /** Get the last error that occurred in the connection. */
  getLastError = () => this.lastError

  /** Get telemetry from the downlow MCU. */
  get () {
    return new Promise<Partial<DownLowTelemetry>>((resolve, reject) => {
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

        const wheels:WheelTelemetry[] = _.range(wheelCount).map(getWheelTelemetryTemplate)

        for (let wi = 0; wi < wheelCount; wi++) {
          // 2 bytes to represent current angle of wheel, in range [0-65535].
          const shortVal = data[dataIdx++] << 8 | data[dataIdx++]
          const unitAngle = shortVal / 65535.0

          wheels[wi].angle = normaliseAngle(unitAngle * 2 * Math.PI)

          // 1 byte to represent rate the drive motor is being driven at.
          wheels[wi].driveRate = (data[dataIdx++] - 127.0) / 127.0

          // 1 byte to represent rate the steering motor is being driven at.
          wheels[wi].steeringRate = (data[dataIdx++] - 127.0) / 127.0

          // 1 byte to represent time wheel has been stuck, in tenths of a second.
          wheels[wi].stuckTime = data[dataIdx++] * 0.1

          // 1 byte to represent temperature of the drive motor controller channel for the wheel, in degrees C.
          // wheels[wi].driveOutputTemperature = data[dataIdx++]

          // 1 byte to represent the current being drawn by the steering motor, in halves of an amp.
          wheels[wi].steeringCurrent = (data[dataIdx++] - 127) * 0.5

          // 1 byte to represent the current being drawn by the drive motor, in halves of an amp.
          wheels[wi].driveCurrent = (data[dataIdx++] - 127) * 0.5
        }

        // 1 byte for wheel fault (of steering motor driver) and ready status flags, bit format [ w3f w2f w1f w0f w3r w2r w1r w0r ]
        for (let wi = 0; wi < wheelCount; wi++) {
          wheels[wi].ready = !!((data[dataIdx] >> wi) & 0x01)
          wheels[wi].steeringMotorControllerFault = !!((data[dataIdx] >> wi + 4) & 0x01)
        }
        dataIdx++

        // 2 bytes to represent battery voltage in tenths of a volt.
        const batteryVoltage = (data[dataIdx++] << 8 | data[dataIdx++]) / 10

        resolve({ batteryVoltage, wheels })
      }

      this.serial.on('data', dataListener)

      attemptRequest()
    })
  }

  /** Send new wheel angles and drive rates to the downlow MCU. */
  updateWheelAnglesAndDriveRate (newWheelState:WheelState[]) {
    if (!this.isConnected()) return
    const data = [Command.Set]
    for (let wi = 0; wi < wheelCount; wi++) {
      // 2 bytes for angle of wheel, in range [0-65535], for [0, 360] degrees.
      const normalisedTo360 = normaliseValueToRange(0, rad2Deg(newWheelState[wi].angle), 360)
      const shortVal = Math.round(normalisedTo360 / 360 * 65535)
      data.push((shortVal >> 8) & 0xff)
      data.push((shortVal >> 0) & 0xff)

      const rate = Math.min(1, Math.max(-1, newWheelState[wi].speed / maxVehicleSpeed))
      // 1 byte for drive rate, 0 = full reverse, 127 = stop, 254 = full forward.
      data.push(Math.round(rate * 127 + 127) & 0xff)
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

const downlowTelemetry:DownLowTelemetry = {
  isConnected: false,
  error: null,
  batteryVoltage: 0,
  wheels: _.range(wheelCount).map(getWheelTelemetryTemplate),
}

export const getDownlowTelemetry = () => _.cloneDeep(downlowTelemetry)

// Periodically updates the internal mutable telemetry.
const updateTelemetry = async () => {
  const updateStarted = Date.now()

  downlowTelemetry.isConnected = !!downlowController && downlowController.isConnected()

  downlowTelemetry.error = downlowController
    ? (downlowController.getLastError() ? '' + downlowController.getLastError() : null)
    : 'Not initialised'

  if (downlowTelemetry.isConnected) {
    try {
      const telemetry = await downlowController.get()
      downlowTelemetry.wheels = telemetry.wheels
      downlowTelemetry.batteryVoltage = telemetry.batteryVoltage
    } catch (err) { }
  }

  // Update no more frequently than motorControllerStateUpdateInterval
  // This allows for the update taking longer than the desired interval.
  setTimeout(updateTelemetry, Math.max(1, downlowTelemetryUpdateInterval - (Date.now() - updateStarted)))
}

// Start process to periodically update motor controller state and stats.
updateTelemetry()
