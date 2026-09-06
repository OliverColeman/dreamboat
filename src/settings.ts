import { ADCConfig } from './hardware/adc'
import { Dimensions, Vec2, ControlType } from './model/types'
import { deg2Rad, mmPerS2kmPerHr } from './util'

/** Values of an environment variable that are taken to mean "on"; anything else means "off". */
const envTruthyValues = ['true', '1', 'yes', 'on']

/** Whether to drive simulated hardware instead of the vehicle.
 * Off unless the environment variable `REACT_APP_SIMULATION_MODE` is set to one of `envTruthyValues`.
 * Create React App inlines `REACT_APP_*` variables when the application is started or built, so the
 * variable must be set for the process running `npm start` or `npm run build`; see `run.sh`.
 */
export const simulationMode = envTruthyValues.includes(
  (process.env.REACT_APP_SIMULATION_MODE ?? '').trim().toLowerCase()
)

/** Which controls steer the vehicle. The hand-held controller carries two analogue joysticks, read
 * over the serial peripheral interface (SPI) from an MCP3008 analogue-to-digital converter (ADC).
 * Simulation runs on an ordinary desktop with neither, so there the keypad (`w`, `a`, `s`, `d`, `x`)
 * and the mouse pad stand in for the first and second joystick respectively.
 */
export const controlType:ControlType = simulationMode ? 'keypadmouse' : 'joystick'

/** Frequency for calculating wheel states, as frames per second. */
export const frameRate = 20 // Per second.
/** Maximum vehicle speed in mm / s */
export const maxVehicleSpeed = 5 * mmPerS2kmPerHr // There are (1000*1000)/(60*60) mm/s in 1 km/h

/** Distance from wheel to pivot point at which to start discounting (proportionall) how much we care about whether
 * the wheel can turn fast enough. If the wheel is very close to the pivot point it means we're (almost) pivoting on
 * it, so it doesn't matter so much if the wheel isn't facing in quite the right direction.
 */
export const wheelPivotDistanceDiscountDistance = 0.5 * 1000

const minSecondsPerRevolution = 10 // How many seconds for one full turn at maximum turn rate.
/** Maximum turn rate of vehicle in revolutions/second */
export const maxRPS = 1.0 / minSecondsPerRevolution
/** Maximum turn rate of wheels */
export const maxWheelSteerRPS = 1.0 // 1 revolution per second

/** How far a wheel may be from its target angle before the vehicle is stopped, in radians.
 * Any difference at all reduces the driving speed, in proportion to the largest difference among the
 * wheels; at or beyond this difference the vehicle is stationary.
 * This is a ride-quality choice, independent of how fast the wheels can steer (`maxWheelSteerRPS`).
 */
export const wheelAngleToleranceForFullSpeed = deg2Rad(30)

/** How much the steering curvature (reciprocal of the distance to the pivot point) may change per second.
 * This limits how quickly the pivot point may be moved towards or away from the vehicle, and how quickly it
 * may move from one side of the vehicle to the other (passing through "straight ahead" on the way).
 */
export const maxCurvatureDeltaPerSecond = 1 / 1000

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
export const fontSize = 24

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
export const movementMagnitudeThreshold = 0.02

/** Baud rate for communication with USB devices. */
export const usbBaudRate = 38400 // 115200
/** Time to wait before resending GET requests for USB devices. */
export const usbGetRetryTimeout = 500 // 38400
/** Number of times to resend GET requests before failing for USB devices. */
export const usbMaxGetAttempts = 3 // 38400

export const downlowMcuSerialNumber = '11692050'

/** Time between updating the telemetry of the downlow MCU, in ms. */
export const downlowTelemetryUpdateInterval = 1000 / frameRate

/** Number of levels on the lighting intensity scale, for both the white and the red, green and blue
 * (RGB) channels. Level 0 is off and level `lightingLevelCount - 1` is full brightness.
 * Stevens' power law puts the exponent for perceived brightness at about 1/3, so the steps are evenly
 * spaced in perceived brightness only if the physical intensity rises as the cube of the level. That
 * conversion belongs to the firmware: the wire carries the level index and the interface displays the
 * index itself, whose even spacing is the point of a perceptual scale.
 */
export const lightingLevelCount = 10

/** Time between re-sends of the lighting state to the downlow MCU, in ms.
 * The lighting state is also sent whenever it changes; the re-send re-syncs the strip after a
 * reconnect without the operator touching anything.
 */
export const lightingResendInterval = 1000
