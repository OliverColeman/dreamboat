import { ADCConfig } from './hardware/adc'
import { Dimensions, Vec2, ControlType } from './model/types'
import { mmPerS2kmPerHr } from './util'

/** Frequency for calculating wheel states, as frames per second. */
export const frameRate = 20 // Per second.
/** Maximum vehicle speed in mm / s */
export const maxVehicleSpeed = 5 * mmPerS2kmPerHr // There are (1000*1000)/(60*60) mm/s in 1 km/h
/** Maximum turn rate of vehicle in revolutions per second. */
export const maxRPS = 0.2 // Revolutions/second
/** Maximum turn rate of wheels */
export const maxWheelSteerRPS = 2.5
/** Distance from wheel to pivot point at which to start discounting (proportionall) how much we care about whether
 * the wheel can turn fast enough. If the wheel is very close to the pivot point it means we're (almost) pivoting on
 * it, so it doesn't matter so much if the wheel isn't facing in quite the right direction.
 */
export const wheelPivotDistanceDiscountDistance = 0.5 * 1000

/** Maximum pivot point change factor.
 * This controls how far the desired pivot point can move,
 * relative to the current distance to the vehicle centre */
export const maxPivotPointDistanceChangeFactor = 0.5
/** Maximum change in vehicle rotation speed (revolutions per second per second). */
export const maxRotationDelta = maxRPS * 0.1

/** Scaling of visualisation, in pixels/mm */
export const visualScale = 0.125 // px/mm
/** Spacing of visualisation grid lines, in mm */
export const gridSpacing = 1000 // mm

export const bedSize:Dimensions = {
  width: 1870,
  height: 2070,
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

export const wheelCount = wheelPositions.length

export const controlVisualSize = 121
export const fontSize = 30

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

/** Threshold below which joystick inputs are considered zero. */
export const movementMagnitudeThreshold = 0.03

/** Baud rate for communication with USB devices. */
export const usbBaudRate = 38400 // 115200
/** Time to wait before resending GET requests for USB devices. */
export const usbGetRetryTimeout = 500 // 38400
/** Number of times to resend GET requests before failing for USB devices. */
export const usbMaxGetAttempts = 3 // 38400

export const downlowMcuSerialNumber = '11692050'

/** Time between updating the telemetry of the downlow MCU, in ms. */
export const downlowTelemetryUpdateInterval = 1000 / 20

/** The ports of the motor controllers. */
export const driveMotorSerialNumbers = ['1600DB368EC8', '160091E42CEB']
/** How many motors there are per motor controller. */
export const motorsPerController = 2
/** Time between updating the telemetry of the motor controllers, in ms. */
export const motorControllerTelemetryUpdateInterval = 1000 / 10
/** Maximum output voltage of sabertooth motor controller as proportion of input voltage. */
export const motorControllerMaxMotorOutputRate = 0.94
/** Maximum output current per channel of sabertooth motor controllers. */
export const motorControllerMaxCurrentPerMotor = 9999
