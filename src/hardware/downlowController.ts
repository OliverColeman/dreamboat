// In electron we may need to use window.require because https://stackoverflow.com/a/43971252/1133481
// So we need to import the SerialPort type and SerialPort class separately.
import _ from 'lodash'
import SerialPort from 'serialport'
import { DownLowTelemetry, LightingPattern, LightingState, WheelState, WheelTelemetry } from '../model/types'
import { downlowMcuSerialNumber, downlowTelemetryUpdateInterval, lightingResendInterval, maxVehicleSpeed, usbBaudRate, usbGetRetryTimeout, usbMaxGetAttempts, wheelCount, simulationMode } from '../settings'
import { normaliseAngle, normaliseValueToRange, rad2Deg } from '../util'

enum Command {
  Set = 83, // 'S'
  Get = 71, // 'G'
  Home = 72, // 'H'
  Lighting = 76, // 'L'
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
  abstract updateLighting(lighting:LightingState): void
  abstract declareWheelsAtHome(): void
}

/** Expected number of bytes in a GET response (7 bytes per wheel + 4 bytes of shared state). */
const GET_RESPONSE_BYTES = wheelCount * 7 + 4

/** The pattern identifiers in the order the firmware indexes them; the position in this list is the
 * value carried on the wire. */
const lightingPatternIndices = Object.keys(LightingPattern) as LightingPattern[]

class DownLow extends DownLowBase {
  private serial: SerialPort | null = null
  private lastError: Error = null
  private reconnectScheduled = false
  // Callback invoked when the active port closes unexpectedly, so in-flight get() can reject.
  private onPortClose: ((port: SerialPort) => void) | null = null
  // The lighting state most recently given by the application, re-sent periodically by resendLighting().
  private lighting: LightingState | null = null

  constructor () {
    super()
    this.connect()
    this.resendLighting()
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

  /** Tell the downlow MCU that every wheel is sitting at its home position, so that it takes the
   * current position as the home reference and treats the wheel as knowing where it is.
   * This is a fallback for a home switch that does not read reliably. The MCU honours it only while
   * the emergency stop is engaged, which is also the only time the interface offers it.
   */
  declareWheelsAtHome () {
    if (!this.isConnected()) return
    this.send([Command.Home])
  }

  /** Send the lighting levels and pattern to the downlow MCU. */
  updateLighting (lighting:LightingState) {
    // Held even while disconnected, so that the periodic re-send restores the strip once it reconnects.
    this.lighting = lighting
    if (!this.isConnected()) return
    const data = [Command.Lighting]
    // 1 byte each for the white and red, green and blue (RGB) levels, as indices into the
    // intensity scale.
    data.push(lighting.whiteLevel & 0xff)
    data.push(lighting.rgbLevel & 0xff)
    // 1 byte for the pattern, as its index in LightingPattern.
    data.push(lightingPatternIndices.indexOf(lighting.pattern) & 0xff)
    this.send(data)
  }

  /** Re-sends the lighting state every lightingResendInterval, so that the strip re-syncs after a
   * reconnect without the operator touching anything. The lighting state is not covered by the
   * downlow watchdog, so the re-send exists only to recover from a lost connection.
   */
  private resendLighting () {
    if (this.lighting) this.updateLighting(this.lighting)
    setTimeout(() => this.resendLighting(), lightingResendInterval)
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
  private lighting:LightingState = { whiteLevel: 0, rgbLevel: 0, pattern: LightingPattern.SOLID }

  isConnected = () => true

  getLastError = () => this.lastError

  /** The telemetry of one poll. Each wheel is copied out, so that every field of a poll comes from
   * one instant, as it does on the vehicle where the downlow MCU assembles a whole Get reply in a
   * single pass. Handing out the live array instead would let the wheel fields move on while the
   * emergency stop flag beside them stayed as the poll found it.
   */
  get = async () => ({
    wheels: this.wheels.map(wheel => ({ ...wheel })),
    emergencyStopTriggered: this.emergencyStopTriggered,
    batteryVoltage: this.batteryVoltage,
  })

  /** Take on the given wheel angles and drive rates.
   * Nothing is taken on while the emergency stop is engaged: the downlow MCU stores the angles and
   * rates a Set command carries but acts on none of them until the stop is released, so the wheels
   * neither steer nor drive and go on reporting the positions they are already at.
   */
  updateWheelAnglesAndDriveRate (newWheelState:WheelState[]) {
    if (this.emergencyStopTriggered) return
    for (let wi = 0; wi < wheelCount; wi++) {
      this.wheels[wi].angle = newWheelState[wi].angle
      this.wheels[wi].driveRate = newWheelState[wi].speed / maxVehicleSpeed
      this.wheels[wi].ready = true
    }
  }

  /** Take every wheel to be sitting at its home position, so that it knows where it is.
   * Acted on only while the emergency stop is engaged, matching the downlow MCU, which refuses it
   * at any other time because a wheel that knows where it is steers to its target angle as soon as
   * the motors are live.
   */
  declareWheelsAtHome () {
    if (!this.emergencyStopTriggered) return
    for (let wi = 0; wi < wheelCount; wi++) {
      this.wheels[wi].angle = 0
      this.wheels[wi].ready = true
    }
  }

  updateLighting (lighting:LightingState) {
    this.lighting = lighting
  }

  /** The lighting state the simulated strip is showing. */
  getLighting = () => this.lighting

  /** Engage the emergency stop if it is disengaged, and disengage it if it is engaged.
   * The field flipped is the one get() reports, so the stop reaches the rest of the application by
   * the telemetry path the emergency stop switch of the vehicle reaches it by.
   * Engaging it stops the motors, which the downlow MCU does within one of its 20 ms wheel updates:
   * the drive and steering rates fall to zero, and so do the currents the motors draw. Of those
   * four the drive rate is the only one this class reports as anything but zero at any time, so the
   * other three assignments record where the stopped values belong rather than change what is
   * shown. The wheel angles are left where they are, because a stopped wheel reports the position
   * its encoder reads rather than the position it was asked for. The stuck times and the steering
   * motor driver fault flags are left alone for the opposite reason: the MCU recalculates them only
   * while the motors run, so they hold their last values for as long as the stop is engaged.
   */
  toggleEmergencyStop () {
    this.emergencyStopTriggered = !this.emergencyStopTriggered
    if (!this.emergencyStopTriggered) return
    for (let wi = 0; wi < wheelCount; wi++) {
      this.wheels[wi].driveRate = 0
      this.wheels[wi].steeringRate = 0
      this.wheels[wi].driveCurrent = 0
      this.wheels[wi].steeringCurrent = 0
    }
  }
}

/**
 * Handles communication with the microcontroller unit (MCU) located under the vehicle.
 * This MCU controls the steering motors for each wheel, and provides associated telemetry.
 * In future it may provide for other things, such as lights and collision avoidance sensors.
 */
export const downlowController = simulationMode ? new DownLowSimulated() : new DownLow()

/** Engage the simulated emergency stop if it is disengaged, and disengage it if it is engaged.
 * Only the simulated downlow controller has an emergency stop to toggle. That of the vehicle is a
 * switch wired to the downlow MCU, which reports the position of the switch in its telemetry and
 * takes no command to change it, so with the real controller in use this does nothing.
 */
export const toggleSimulatedEmergencyStop = () => {
  if (downlowController instanceof DownLowSimulated) downlowController.toggleEmergencyStop()
}

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
