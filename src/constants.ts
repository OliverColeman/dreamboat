import { Enum } from '@martin_hotell/rex-tils'
import { Dimensions, Vec2 } from './types'

export const frameRate = 10 // Per second.
export const maxSpeed = 5 * (1000 * 1000) / (60 * 60) // mm/s  (There are (1000*1000)/(60*60) mm/s in 1 km/h)
export const maxRPS = 0.1 // Revolutions/second
export const movementMagnitudeThreshold = 0.03
export const maxWheelSteerRPS = 1 // 60 RPM

export const visualScale = 0.125 // px/mm
export const gridSpacing = 1000 // mm

export const bedSize:Dimensions = {
  width: 1530,
  height: 2030,
}
export const wheelCentreMargin = 250
export const wheelDiameter = 350
export const wheelWidth = 60
export const wheelPositions:Array<Vec2> = [
  {
    x: -bedSize.width / 2 + wheelCentreMargin,
    y: -bedSize.height / 2 + wheelCentreMargin,
  },
  {
    x: bedSize.width / 2 - wheelCentreMargin,
    y: -bedSize.height / 2 + wheelCentreMargin,
  },
  {
    x: -bedSize.width / 2 + wheelCentreMargin,
    y: bedSize.height / 2 - wheelCentreMargin,
  },
  {
    x: bedSize.width / 2 - wheelCentreMargin,
    y: bedSize.height / 2 - wheelCentreMargin,
  },
]

export const DriveMode = Enum(
  'DRIVE_MY_CAR',
  'DAY_TRIPPER',
  'TWIST_AND_SHOUT'
)
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type DriveMode = Enum<typeof DriveMode>
export const driveModeLabels = Object.freeze({
  [DriveMode.DRIVE_MY_CAR]: 'Drive My Car',
  [DriveMode.DAY_TRIPPER]: 'Day Tripper',
  [DriveMode.TWIST_AND_SHOUT]: 'Twist and Shout',
})

export type ControlType = 'joystick' | 'keypadmouse'
export const controlType:ControlType = 'joystick'

export const Controls2D = Enum(
  'MOTION_0',
  'MOTION_1'
)
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Controls2D = Enum<typeof Controls2D>

export const joystick0 = {
  channelX: 0,
  channelY: 1,
}
export const joystick1 = {
  channelX: 2,
  channelY: 3,
}

export const controlVisualSize = 101
export const fontSize = 36
