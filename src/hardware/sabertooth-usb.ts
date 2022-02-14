// In electron we may need to use window.require because https://stackoverflow.com/a/43971252/1133481
// So we need to import the SerialPort type and SerialPort class separately.
import SerialPort from 'serialport'

import _ from 'lodash'
let SerialPortClass:typeof SerialPort
try {
  // In electron window.require should be used.
  SerialPortClass = window.require('serialport')
} catch (e) {
  SerialPortClass = require('serialport')
}

export type SingleChannel = 1 | 2
export type Channel = 1 | 2 | '*'

export enum GetType {
  Value = 0x00,
  Battery = 0x10,
  Current = 0x20,
  Temperature = 0x40
}

export enum SetType {
  Value = 0x00,
  KeepAlive = 0x10,
  Shutdown = 0x20,
  Timeout = 0x40
}

export enum Command {
  Set = 40,
  Get = 41
}

export enum Type {
  Motor = 77,
  Freewheel = 81,
  Signal = 83,
  Aux = 65,
  Power = 80,
  CurrentLimit = 84,
  Ramping = 82,
}

export enum MixedModeMotor {
  Drive = 68,
  Turn = 84,
}

/** Sabertooth USB connection options. */
export type Options = {
  /** Serial baud rate, options are 2400, 9600, 19200, 38400 and 115200. Default is 38400. */
  baudRate?:number
  /** The timeout for get requests, in ms. Default is 1000. */
  timeout?:number
  /** The address of the Sabertooth. Default is 128. */
  address?:number
  /** The number of times to attempt a get request. Default is 3. */
  maxGetAttemptCount?: number
  /** Flag to enable debug console.log messages. Default is false. */
  debug?: boolean
}

const MASK = 127

const appendChecksum = (buffer:number[], offset:number) => {
  buffer.push(_.sum(buffer.slice(offset)) & MASK)
}

/**
 * Controls USB-enabled Sabertooth motor drivers running in Packet Serial mode.
 *
 * See https://www.dimensionengineering.com/datasheets/USBSabertoothPacketSerialReference.pdf
 *
 * Note: Only Checksum protection is implemented, not CRC.
 */
export class SabertoothUSB {
  /** The path for the USB serial port this SabertoothUSB is connected to. */
  readonly path:string
  /** The address of the Sabertooth. */
  readonly address: number
  /** The timeout for get requests, in ms. */
  readonly timeout: number
  /** The number of retry attempts for get requests. */
  readonly maxGetAttemptCount: number
  /** Flag indicating if console.log debug messages are enabled. */
  readonly debug: boolean

  private serial: SerialPort
  private lastError: Error = null

  /**
   * Create an object to control a motor driver.
   *
   * A connection will to the motor driver will be attempted upon creation but
   * this is asynchronous and is not available immediately after creation.
   * If the connection failes reconnection will be attempted automatically.
   *
   * @param path the path to the (USB) serial port. eg `/dev/ttyACM0` or `COM1`.
   * @param options Optional connection options. See `Options` type for details.
   */
  constructor (path:string, options?:Options) {
    this.path = path
    this.timeout = options?.timeout ?? 1000
    this.address = options?.address ?? 128
    this.maxGetAttemptCount = options?.maxGetAttemptCount ?? 3
    this.debug = !!options?.debug
    this.serial = new SerialPortClass(path, { baudRate: options?.baudRate ?? 38400, autoOpen: false })

    let connectIntervalHandle:any

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
      this.debug && console.error(`Sabertooth (${this.path}) error:`, err)
      this.lastError = err
    })

    this.serial.on('close', (err) => {
      this.debug && console.error(`Sabertooth (${this.path}) disconnected, attempting to reconnect`)
      this.lastError = err
      connect()
    })

    connect()
  }

  /** Returns true iff the USB serial connection to the motor driver is open and working. */
  isConnected = () => this.serial.isOpen

  /** Get the last error that occurred in the connection to the motor driver. */
  getLastError = () => this.lastError

  private checkRange (value:number, min:number, max:number, argName:string) {
    if (value < min || value > max) {
      throw Error(`Sabertooth (${this.path}): invalid value for ${argName}: ${value}, must be in range [${min}, ${max}]`)
    }
  }

  /**
   * Controls the specified motor output(s).
   * This sets the output of the motor channel as a fraction of the battery voltage.
   *
   * @param channel the motor channel(s), either `1`, `2`, or `*` for all motors.
   * @param rate the new rate for the motor(s), in range [-1, 1] for maximum reverse to maximum forward respectively.
   */
  setMotor (channel:Channel, rate:number) {
    this.checkRange(rate, -1, 1, 'rate')
    this.set(Type.Motor, channel, Math.round(rate * 2047))
  }

  /**
   * Controls the specified power output, if the power output is configured as a controllable output.
   *
   * @param channel the power channel(s), either `1`, `2`, or `*` for all channels.
   * @param rate the new rate for the power output(s), in range [-1, 1]
   */
  setPower (channel:Channel, rate:number) {
    this.checkRange(rate, -1, 1, 'rate')
    this.set(Type.Power, channel, Math.round(rate * 2047))
  }

  /**
   * Controls the mixed-mode (differential) drive rate.
   *
   * @param rate the new drive rate for the motors, in range [-1, 1] for maximum reverse to maximum forward respectively.
   */
  setDrive (rate:number) {
    this.checkRange(rate, -1, 1, 'rate')
    this.set(Type.Motor, MixedModeMotor.Drive, Math.round(rate * 2047))
  }

  /**
   * Controls the mixed-mode (differential) turn rate.
   *
   * @param rate the new turn rate for the motors, in range [-1, 1] for maximum left to maximum right respectively.
   */
  setTurn (rate:number) {
    this.checkRange(rate, -1, 1, 'rate')
    this.set(Type.Motor, MixedModeMotor.Turn, Math.round(rate * 2047))
  }

  /**
   * Enables or disables freewheeling for the specified motor output(s).
   *
   * @param channel the motor channel(s), either `1`, `2`, or `*` for all motors.
   * @param enableFreewheel True to enable freewheeling, false to disable freewheeling.
   */
  setFreewheel (channel:Channel, enableFreewheel:boolean) {
    this.set(Type.Freewheel, channel, enableFreewheel ? 2048 : 0)
  }

  /**
   * Shuts down motor or power output(s).
   *
   * @param type The type of output to shutdown, either `SetType.Motor` or `SetType.Power`
   * @param channel the channel(s), either `1`, `2`, or `*` for all channels.
   * @param enableFreewheel True to trigger shutdown, false to clear the shutdown.
   */
  shutDown (type:Type.Motor | Type.Power, channel:Channel, shutdownEnabled:boolean) {
    this.set(type, channel, shutdownEnabled ? 2048 : 0, SetType.Shutdown)
  }

  /**
   * Sets the current limit for the specified motor output channel.
   *
   * @param channel the motor channel(s), either `1`, `2`, or `*` for all channels.
   * @param currentLimit the new current limit on Amps, in range (0, 100], or -1 to use the default limit.
   */
  setCurrentLimit (channel:Channel, currentLimit:number) {
    this.checkRange(currentLimit, -1, 100, 'currentLimit')
    this.set(
      Type.CurrentLimit,
      channel,
      currentLimit < 0 ? -1 : Math.round(currentLimit / 100 * 2047)
    )
  }

  /**
   * Sets the ramping for the specified motor output channel.
   *
   * @param channel the motor channel(s), either `1`, `2`, or `*` for all channels.
   * @param ramping The ramping value, between -16383 (fast) and 2047 (slow).
   */
  setRamping (channel:Channel, ramping:number) {
    this.checkRange(ramping, -16383, 2047, 'ramping')
    this.set(Type.Ramping, channel, ramping)
  }

  /**
   * Get the battery/source voltage.
   */
  async getBatteryVoltage () {
    return await this.get(Type.Motor, 1, GetType.Battery) / 10
  }

  /**
   * Get the output transistor temperature for the specified motor channel, in degrees centigrade.
   */
  async getMotorDriverOutputTemperature (channel:SingleChannel) {
    this.checkRange(channel, 1, 2, 'channel')
    return this.get(Type.Motor, channel, GetType.Temperature)
  }

  /**
   * Get the output rate for the specified motor channel, in range [-1, 1].
   */
  async getMotorDriverOutputRate (channel:SingleChannel) {
    this.checkRange(channel, 1, 2, 'channel')
    return await this.get(Type.Motor, channel, GetType.Value) / 2047
  }

  /**
   * Get the output current for the specified motor channel, in Amps.
   * This is a noisy signal and may vary by up to several amps.
   * Positive current values indicate energy is being drawn from the battery,
   * and negative values indicate energy is being regenerated into the battery.
   */
  async getMotorCurrent (channel:SingleChannel) {
    this.checkRange(channel, 1, 2, 'channel')
    return await this.get(Type.Motor, channel, GetType.Current) / 10
  }

  private get (type:number, channel:SingleChannel, getType:number, scaled:boolean = true) {
    if (!scaled) getType |= 2
    return new Promise<number>((resolve, reject) => {
      let attemptCount = 0
      let timeoutHandle:any

      const attemptRequest = () => {
        attemptCount += 1

        this.sendCommand(Command.Get, [getType, type, channel])

        timeoutHandle = setTimeout(() => {
          this.debug && console.warn(`Sabertooth (${this.path}) get request timed out after ${attemptCount} attempts`)

          if (attemptCount === this.maxGetAttemptCount) {
            this.debug && console.error(`Sabertooth (${this.path}) aborting get request`)
            this.serial.removeListener('data', dataListener)
            reject(Error(`Sabertooth (${this.path}) get request timed out`))
          } else {
            this.debug && console.warn(`Sabertooth (${this.path}) retrying get request`)
            // Try again...
            attemptRequest()
          }
        }, this.timeout)
      }

      const dataListener = (data:Buffer) => {
        if (getType === (data[2] & ~1)
        && type === data[6]
        && channel === data[7]) {
          clearTimeout(timeoutHandle)
          this.serial.removeListener('data', dataListener)
          const value = data[4] << 0 | data[5] << 7
          resolve((data[2] & 1) !== 0 ? -value : value)
        }
      }

      this.serial.on('data', dataListener)

      attemptRequest()
    })
  }

  private set (type:number, channel:Channel | MixedModeMotor, value:number, setType = SetType.Value) {
    let flags = setType
    if (value < 0) {
      value = -value
      flags |= 1
    }
    const data = [
      flags,
      (value >> 0) & 0x7f,
      (value >> 7) & 0x7f,
      type,
      (typeof channel === 'string') ? channel.charCodeAt(0) : channel,
    ]
    this.sendCommand(Command.Set, data)
  }

  private sendCommand (command:number, data:number[]) {
    const buffer = [this.address, command, data[0]]
    appendChecksum(buffer, 0)

    if (data.length > 1) {
      data.slice(1).forEach(d => buffer.push(d))
      appendChecksum(buffer, 4)
    }

    this.serial.write(Buffer.from(buffer))
  }
}

/** Get a list of the avilable Sabertooth devices.
 * The return is an array of objects with fields like:
 * ```
 * manufacturer: 'Dimension Engineering',
 * serialNumber: '1600DB368EC8',
 * pnpId: 'usb-Dimension_Engineering_Sabertooth_2x32_1600DB368EC8-if01',
 * locationId: undefined,
 * vendorId: '268b',
 * productId: '0201',
 * path: '/dev/ttyACM0'
 * ```
 */
export const listSabertoothDevices = async () =>
  (await SerialPortClass.list()).filter(port => port.pnpId?.startsWith('usb-Dimension_Engineering_Sabertooth'))
