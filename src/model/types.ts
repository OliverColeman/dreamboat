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

/** Current state of a wheel */
export type WheelState = {
  /** Desired speed */
  speed: number
  /** Desired rotation relative to vehicle */
  rotation: number
  /** Is the wheel direction currently flipped 180 degrees. */
  flipped: boolean
}

/** Current state of vehicle */
export type VehicleState = {
  /** Predicted position of vehicle in absolute coordinates */
  centreAbs: Point
  /** Predicted absolute rotation of vehicle */
  rotationPredicted: number
  /** State for each wheel */
  wheels: WheelState[]
  /** Target state for each wheel */
  wheelsTarget: WheelState[]
  /** Current actual relative pivot point */
  pivot: Coord
  /** Current target relative pivot point */
  pivotTarget: Coord
  /** Current predicted pivot point in absolute coordinates */
  pivotAbs:Point
  /** Current predicted speed */
  speedPredicted: number
  /** Current error state, if any */
  error:string|null
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