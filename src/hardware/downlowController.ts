// In electron we may need to use window.require because https://stackoverflow.com/a/43971252/1133481
// So we need to import the SerialPort type and SerialPort class separately.
import _ from 'lodash'
import SerialPort from 'serialport'
import { DownLowTelemetry, WheelState, WheelTelemetry } from '../model/types'
import { downlowMcuSerialNumber, downlowTelemetryUpdateInterval, maxVehicleSpeed, usbBaudRate, usbGetRetryTimeout, usbMaxGetAttempts, wheelCount, simulationMode } from '../settings'
import { normaliseAngle, normaliseValueToRange, rad2Deg } from '../util'

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

abstract class DownLowBase {
  abstract isConnected(): boolean
  abstract getLastError(): Error
  abstract get(): Promise<Partial<DownLowTelemetry>>
  abstract updateWheelAnglesAndDriveRate(newWheelState:WheelState[]): void
}

/** Expected number of bytes in a GET response (7 bytes per wheel + 4 bytes of shared state). */
const GET_RESPONSE_BYTES = wheelCount * 7 + 4

class DownLow extends DownLowBase {
  private serial: SerialPort | null = null
  private lastError: Error = null
  private reconnectScheduled = false
  // Callback invoked when the active port closes unexpectedly, so in-flight get() can reject.
  private onPortClose: ((port: SerialPort) => void) | null = null

  constructor () {
    super()
    this.connect()
  }

  /** Load SerialPort class and begin initial connection attempt. */
  private async connect () {
    let SerialPortClass:typeof SerialPort
    try {
      // In electron window.require should be used.
      SerialPortClass = window.require('serialport')
    } catch (e) {
      SerialPortClass = require('serialport')
    }
    this.tryConnect(SerialPortClass)
  }

  /**
   * Re-enumerate USB devices to find the MCU by serial number, then create and open
   * a fresh SerialPort instance. Re-enumeration on every reconnect attempt handles
   * device path changes (e.g. /dev/ttyACM0 → /dev/ttyACM1) that occur after a
   * physical USB disconnect/reconnect.
   */
  private async tryConnect (SerialPortClass:typeof SerialPort) {
    let devices:SerialPort.PortInfo[]
    try {
      devices = (await SerialPortClass.list()).filter(port => port.serialNumber === downlowMcuSerialNumber)
    } catch (e) {
      this.lastError = e
      this.scheduleReconnect(SerialPortClass)
      return
    }

    if (devices.length === 0) {
      this.lastError = new Error('Could not find downlow MCU')
      this.scheduleReconnect(SerialPortClass)
      return
    }

    const port = new SerialPortClass(devices[0].path, {
      baudRate: usbBaudRate,
      autoOpen: false,
    })

    port.on('open', () => {
      this.lastError = null
    })

    port.on('error', (err) => {
      this.lastError = err
    })

    port.on('close', (err) => {
      // Ignore stale events from a port that is no longer the active one.
      if (port !== this.serial) return
      if (err) this.lastError = new Error(err.message || 'Port closed unexpectedly')
      this.serial = null
      // Notify any in-flight get() so it can reject immediately rather than hanging.
      if (this.onPortClose) {
        const cb = this.onPortClose
        this.onPortClose = null
        cb(port)
      }
      this.scheduleReconnect(SerialPortClass)
    })

    this.serial = port
    port.open((err) => {
      if (err) {
        this.lastError = err
        if (this.serial === port) this.serial = null
        this.scheduleReconnect(SerialPortClass)
      }
    })
  }

  /** Schedule a single reconnect attempt in 1 second, preventing duplicate timers. */
  private scheduleReconnect (SerialPortClass:typeof SerialPort) {
    if (this.reconnectScheduled) return
    this.reconnectScheduled = true
    setTimeout(() => {
      this.reconnectScheduled = false
      this.tryConnect(SerialPortClass)
    }, 1000)
  }

  /** Returns true iff the USB serial connection is open and working. */
  isConnected = () => !!this.serial && this.serial.isOpen

  /** Get the last error that occurred in the connection. */
  getLastError = () => this.lastError

  /** Get telemetry from the downlow MCU. */
  get () {
    // Capture the port reference at call time so cleanup() can remove listeners
    // even after this.serial has been cleared by a disconnect.
    const serial = this.serial
    return new Promise<Partial<DownLowTelemetry>>((resolve, reject) => {
      let attemptCount = 0
      // eslint-disable-next-line no-undef
      let timeoutHandle:NodeJS.Timeout
      // Accumulate incoming bytes across multiple data events (serial data can
      // arrive in fragments rather than as a single complete response).
      let receiveBuffer = new Uint8Array(0)

      const cleanup = () => {
        clearTimeout(timeoutHandle)
        serial.removeListener('data', dataListener)
        this.onPortClose = null
      }

      // Reject the promise immediately if the port closes while we are waiting,
      // (don't hang until all retry timeouts have elapsed).
      this.onPortClose = (closedPort) => {
        if (closedPort !== serial) return
        cleanup()
        reject(new Error('Serial port closed during get request'))
      }

      const attemptRequest = () => {
        attemptCount += 1
        receiveBuffer = new Uint8Array(0)

        this.send([Command.Get])

        // If timeout enabled.
        if (usbGetRetryTimeout > 0) {
          timeoutHandle = setTimeout(() => {
            console.warn(`Downlow get request timed out after ${attemptCount} attempts`)

            if (attemptCount === usbMaxGetAttempts) {
              console.error('Downlow aborting get request')
              cleanup()
              reject(new Error('Downlow get request timed out'))
            } else {
              console.warn('Downlow retrying get request')
              // Try again...
              attemptRequest()
            }
          }, usbGetRetryTimeout)
        }
      }

      const dataListener = (data:Buffer | Uint8Array) => {
        // Accumulate bytes until we have a complete response.
        const tmp = new Uint8Array(receiveBuffer.length + data.length)
        tmp.set(receiveBuffer)
        tmp.set(data, receiveBuffer.length)
        receiveBuffer = tmp
        if (receiveBuffer.length < GET_RESPONSE_BYTES) return

        cleanup()

        let dataIdx = 0

        const wheels:WheelTelemetry[] = _.range(wheelCount).map(getWheelTelemetryTemplate)

        for (let wi = 0; wi < wheelCount; wi++) {
          // 2 bytes to represent current angle of wheel, in range [0-65535].
          const shortVal = receiveBuffer[dataIdx++] << 8 | receiveBuffer[dataIdx++]
          const unitAngle = shortVal / 65535.0

          wheels[wi].angle = normaliseAngle(unitAngle * 2 * Math.PI)

          // 1 byte to represent rate the drive motor is being driven at.
          wheels[wi].driveRate = (receiveBuffer[dataIdx++] - 127.0) / 127.0

          // 1 byte to represent rate the steering motor is being driven at.
          wheels[wi].steeringRate = (receiveBuffer[dataIdx++] - 127.0) / 127.0

          // 1 byte to represent time wheel has been stuck, in tenths of a second.
          wheels[wi].stuckTime = receiveBuffer[dataIdx++] * 0.1

          // 1 byte to represent temperature of the drive motor controller channel for the wheel, in degrees C.
          // wheels[wi].driveOutputTemperature = receiveBuffer[dataIdx++]

          // 1 byte to represent the current being drawn by the steering motor, in halves of an amp.
          wheels[wi].steeringCurrent = (receiveBuffer[dataIdx++] - 127) * 0.5

          // 1 byte to represent the current being drawn by the drive motor, in halves of an amp.
          wheels[wi].driveCurrent = (receiveBuffer[dataIdx++] - 127) * 0.5
        }

        // 1 byte for wheel fault (of steering motor driver) and ready status flags, bit format [ w3f w2f w1f w0f w3r w2r w1r w0r ]
        for (let wi = 0; wi < wheelCount; wi++) {
          wheels[wi].ready = !!((receiveBuffer[dataIdx] >> wi) & 0x01)
          wheels[wi].steeringMotorControllerFault = !!((receiveBuffer[dataIdx] >> wi + 4) & 0x01)
        }
        dataIdx++

        // 1 byte for general status flags, bit format [ e-stop, ]
        const emergencyStopTriggered = !!(receiveBuffer[dataIdx] & 0x01)
        dataIdx++

        // 2 bytes to represent battery voltage in tenths of a volt.
        const batteryVoltage = (receiveBuffer[dataIdx++] << 8 | receiveBuffer[dataIdx++]) / 10

        resolve({ emergencyStopTriggered, batteryVoltage, wheels })
      }

      serial.on('data', dataListener)

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

/** Simulated downlow controller, assumes that all commands are followed exactly by the hardware. */
class DownLowSimulated extends DownLowBase {
  private lastError: Error = null
  private wheels:WheelTelemetry[] = _.range(wheelCount).map(getWheelTelemetryTemplate)
  private emergencyStopTriggered = false
  private batteryVoltage = 13.0

  isConnected = () => true

  getLastError = () => this.lastError

  get = async () => ({
    wheels: this.wheels,
    emergencyStopTriggered: this.emergencyStopTriggered,
    batteryVoltage: this.batteryVoltage,
  })

  updateWheelAnglesAndDriveRate (newWheelState:WheelState[]) {
    for (let wi = 0; wi < wheelCount; wi++) {
      this.wheels[wi].angle = newWheelState[wi].angle
      this.wheels[wi].driveRate = newWheelState[wi].speed / maxVehicleSpeed
      this.wheels[wi].ready = true
    }
  }
}

/**
 * Handles communication with the microcontroller unit (MCU) located under the vehicle.
 * This MCU controls the steering motors for each wheel, and provides associated telemetry.
 * In future it may provide for other things, such as lights and collision avoidance sensors.
 */
export const downlowController = simulationMode ? new DownLowSimulated() : new DownLow()

const downlowTelemetry:DownLowTelemetry = {
  isConnected: false,
  error: null,
  emergencyStopTriggered: false,
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
      downlowTelemetry.emergencyStopTriggered = telemetry.emergencyStopTriggered
      downlowTelemetry.batteryVoltage = telemetry.batteryVoltage
      downlowTelemetry.emergencyStopTriggered = telemetry.emergencyStopTriggered
    } catch (err) { }
  }

  // Update no more frequently than downlowTelemetryUpdateInterval
  // This allows for the update taking longer than the desired interval.
  setTimeout(updateTelemetry, Math.max(1, downlowTelemetryUpdateInterval - (Date.now() - updateStarted)))
}

// Start process to periodically update motor controller state and stats.
updateTelemetry()
