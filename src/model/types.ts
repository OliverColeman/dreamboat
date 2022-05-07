import { Enum } from '@martin_hotell/rex-tils'

export type Dimensions = {
  width: number,
  height: number
}
export type Vec2 = { x: number, y: number }
export type Point = Vec2
export type Polar = {
  /** Distance */
  r: number,
  /** Angle in radians */
  a: number
}
export type Coord = Point & Polar

/** Target state of a wheel */
export type WheelState = {
  /** Desired speed in mm/s. */
  speed: number
  /** Desired rotation relative to vehicle, in range [-pi, pi] */
  angle: number
  /** Is the wheel direction currently flipped 180 degrees. */
  flipped: boolean
}

/** Information about wheel state. Provided by the downlow MCU. */
export type WheelTelemetry = {
  /** Indicates ready status of the wheel - a wheel is ready when it knows its position. */
  ready: boolean
  /** Current wheel angle, in range [-pi, pi]. */
  angle: number
  /** Rate the steering motor is being driven at, in range [-1, 1]. */
  steeringRate: number
  /** Rate the drive motor is being driven at, in range [-1, 1]. */
  driveRate: number
  /** Number of seconds a wheel seems to have been stuck for -
   * a wheel is stuck when it isn't turning sufficiently fast enough towards the target angle. */
  stuckTime: number
  /** Temperature of output transistors on drive motor controller in deg. C. */
  driveOutputTemperature: number
  /** Current being drawn by steering motor in Amps. */
  steeringCurrent: number
  /** Current being drawn by drive motor in Amps. */
  driveCurrent: number
  /** Flag to indicating if a fault has occurred with the steering motor controller channel for this wheel. */
  steeringMotorControllerFault: boolean

}

/** Information about the microcontroller under the vehicle (which controls steering motors and mayne other things). */
export type DownLowTelemetry = {
  isConnected: boolean
  error: string
  /** Battery voltage. */
  batteryVoltage: number
  /** Telemetry for each wheel. */
  wheels: WheelTelemetry[]
}

/** Information about the handheld controller
 * (which contains the raspberry pi and constites the brains of the operation, running this software). */
export type ControllerTelemetry = {
  cpuTemperature: number
}

export type Telemetry = {
  downlow: DownLowTelemetry
  controller: ControllerTelemetry
}

/** Current state of vehicle */
export type VehicleState = {
  /** Predicted position of vehicle in absolute coordinates */
  centreAbs: Point
  /** Predicted absolute rotation of vehicle */
  rotationPredicted: number
  /** Target state for each wheel in next iteration */
  wheelsNext: WheelState[]
  /** Target state for each wheel based on current control input */
  wheelsTarget: WheelState[]
  /** Current actual relative pivot point */
  pivot: Coord
  /** Current target relative pivot point */
  pivotTarget: Coord
  /** Current predicted pivot point in absolute coordinates */
  pivotAbs:Point
  /** Current predicted speed, mm/s */
  speedPredicted: number
  /** Current predicted angular velocity, rad/s */
  rpmPredicted: number
  /** Current error state, if any */
  error:string|null
  /** Telemetry from various sensors. */
  telemetry: Telemetry
}

export const DriveMode = Enum(
  'DRIVE_MY_CAR',
  'DAY_TRIPPER',
  'HELTER_SKELTER',
  'MAGICAL_MYSTERY_TOUR'
)
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type DriveMode = Enum<typeof DriveMode>
export const driveModeLabels = Object.freeze({
  [DriveMode.DRIVE_MY_CAR]: 'Drive My Car',
  [DriveMode.DAY_TRIPPER]: 'Day Tripper',
  [DriveMode.HELTER_SKELTER]: 'Helter Skelter',
  [DriveMode.MAGICAL_MYSTERY_TOUR]: 'Magical Mystery Tour',
})

export type ControlType = 'joystick' | 'keypadmouse'

export const Controls2D = Enum(
  'MOTION_0',
  'MOTION_1'
)
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Controls2D = Enum<typeof Controls2D>

export type AppDimensionStyleProps = {
  appDimensions:Dimensions
}
