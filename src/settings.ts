// import { ADCConfig } from './hardware/adc'
import { Dimensions, Vec2, ControlType } from './model/types'
import { mmPerS2kmPerHr } from './util'

/** Frequency for calculating wheel states, as frames per second. */
export const frameRate = 20 // Per second.
/** Maximum vehicle speed in mm / s */
export const maxSpeed = 5 * mmPerS2kmPerHr // There are (1000*1000)/(60*60) mm/s in 1 km/h
/** Maximum turn rate of vehicle in revolutions per second. */
export const maxRPS = 0.05 // Revolutions/second
/** Maximum turn rate of wheels */
export const maxWheelSteerRPS = 1 // 60 RPM
/** Scaling of visualisation, in pixels/mm */
export const visualScale = 0.125 // px/mm
/** Spacing of visualisation grid lines, in mm */
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

// export const joystickADCConfig: Partial<ADCConfig> = Object.freeze({
//   sampleFrequency: 100,
//   denoiseAlpha: 0.2,
// })

export const joystick0 = {
  channelX: 0,
  channelY: 1,
}
export const joystick1 = {
  channelX: 2,
  channelY: 3,
}

/** Threshold below which joystick inputs are ignored. */
export const movementMagnitudeThreshold = 0.03
