import { ADCConfig } from './hardware/adc'
import { Dimensions, Vec2, ControlType } from './model/types'

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

export const controlVisualSize = 121
export const fontSize = 36

export const controlType:ControlType = 'joystick'

export const joystickADCConfig: Partial<ADCConfig> = Object.freeze({
  sampleFrequency: 100,
  denoiseAlpha: 0.2,
})

export const joystick0 = {
  channelX: 0,
  channelY: 1,
}
export const joystick1 = {
  channelX: 2,
  channelY: 3,
}
