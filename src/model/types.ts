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
  // /** Temperature of output transistors on drive motor controller in deg. C. */
  // driveOutputTemperature: number
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
  emergencyStopTriggered: boolean
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
  /** Current signed steering curvature (reciprocal of the distance to the pivot point), positive for a
   * pivot point to the right of the vehicle and negative for one to the left. Used by DRIVE_MY_CAR. */
  pivotCurvature: number
  /** For how many consecutive frames the commanded wheel angles have stayed where they are while the
   * steering was still being asked to come back to straight ahead. A wheel that cannot turn holds
   * the steering off straight for ever, and this is how that is noticed. */
  steeringStalledFrames: number
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
  /** Flag indicating if the brake is currently enabled. */
  brakeEnabled: boolean
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

export const LightingPattern = Enum(
  'SOLID',
  'RAINBOW',
  'CHASE',
  'PULSE',
  'SPARKLE'
)
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type LightingPattern = Enum<typeof LightingPattern>
export const lightingPatternLabels = Object.freeze({
  [LightingPattern.SOLID]: 'Solid',
  [LightingPattern.RAINBOW]: 'Rainbow',
  [LightingPattern.CHASE]: 'Chase',
  [LightingPattern.PULSE]: 'Pulse',
  [LightingPattern.SPARKLE]: 'Sparkle',
})

/** Target state of the light-emitting diode (LED) strip.
 * The white channel and the red, green and blue (RGB) channels are independent: the white level sets a
 * steady wash over the whole strip and the RGB level scales the brightness of the selected pattern, so
 * either may be off while the other is lit. Both levels are indices into the perceptual intensity scale,
 * in the range [0, lightingLevelCount - 1].
 */
export type LightingState = {
  whiteLevel: number
  rgbLevel: number
  pattern: LightingPattern
}

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
