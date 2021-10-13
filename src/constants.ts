import { Enum } from '@martin_hotell/rex-tils'
import { Dimensions, Vec2 } from './types'

export const frameRate = 10 // Per second.
export const maxSpeed = 5 * (1000 * 1000) / (60 * 60) // mm/s  (There are (1000*1000)/(60*60) mm/s in 1 km/h)
export const maxRPS = 0.1 // Revolutions/second
export const movementMagnitudeThreshold = 0.03
export const maxWheelSteerRPS = 1 // 60 RPM

export const visualScale = 0.1 // px/mm

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

export const control0 = 'joystick0' // 'wasd'
export const control1 = 'mouse' // 'mouse'

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
