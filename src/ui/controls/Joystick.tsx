import React, { useEffect, useMemo, useState } from 'react'
import { makeStyles, Theme } from '@material-ui/core'
import { CallbackInterface, useRecoilCallback, useRecoilValue } from 'recoil'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRedo, faDotCircle } from '@fortawesome/free-solid-svg-icons'
import produce from 'immer'
import _ from 'lodash'
import { control2DFamily } from '../../model/state'
import { Point } from '../../model/types'
import { getADC } from '../../hardware/adc'
import { Control2DProps, update2DControlCoords } from './common'
import { controlVisualSize, joystickADCConfig } from '../../settings'

export type JoystickProps = Control2DProps & {
  /** ADC channel for X axis. */
  channelX: number
  /** ADC channel for Y axis. */
  channelY: number
}

enum CalibrationStage {
  ROTATE,
  CENTER,
  CALIBRATED,
}
enum CalibrationPosition {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

type Calibration = {
  min: Point
  max: Point
  centre: Point
}

const CALIBRATION_ROTATE_COUNT = 2
const CALIBRATION_CENTRE_COUNT = 20 // 100
const CALIBRATION_SAMPLE_HZ = 100

const pointSize = controlVisualSize / 12

export type StyleProps = {
  coords: Point
}

const useStyles = makeStyles<Theme, StyleProps>((theme) => ({
  root: {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    height: controlVisualSize,
    width: controlVisualSize,
    borderStyle: 'solid',
    borderWidth: '3px',
    borderColor: theme.palette.grey[400],
    borderRadius: '50%',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'content-box',
  },
  vertAxis: {
    position: 'absolute',
    left: (controlVisualSize - 1) / 2,
    width: 1,
    height: controlVisualSize,
    backgroundColor: theme.palette.grey[400],
  },
  horzAxis: {
    position: 'absolute',
    top: (controlVisualSize - 1) / 2,
    width: controlVisualSize,
    height: 1,
    backgroundColor: theme.palette.grey[400],
  },
  value: ({ coords }) => ({
    position: 'absolute',
    top: (coords.y / 2 + 0.5) * controlVisualSize - pointSize / 2,
    left: (coords.x / 2 + 0.5) * controlVisualSize - pointSize / 2,
    width: pointSize,
    height: pointSize,
    borderRadius: pointSize / 2,
    backgroundColor: theme.palette.secondary.main,
  }),
  calibrate: ({
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: controlVisualSize,
    height: controlVisualSize,
    color: theme.palette.warning.main,
    zIndex: 20,
  }),
}))

const Joystick = React.memo(function Joystick (props: JoystickProps) {
  const { id, channelX, channelY } = props

  const adc = useMemo(
    () => {
      const adc = getADC(joystickADCConfig)
      adc.openChannel(channelX)
      adc.openChannel(channelY)
      return adc
    },
    [channelX, channelY]
  )

  const adcResolution = adc.resolution()
  const defaultAdcMin = adcResolution * 0.2
  const defaultAdcMax = adcResolution * 0.8
  const defaultAdcCentre = adcResolution * 0.5

  const [calibrationStage, setCalibrateStage] = useState<CalibrationStage>(CalibrationStage.ROTATE)
  const [calibration, setCalibration] = useState<Calibration>({
    min: { x: defaultAdcMin, y: defaultAdcMin },
    max: { x: defaultAdcMax, y: defaultAdcMax },
    centre: { x: defaultAdcCentre, y: defaultAdcCentre },
  })
  const [calibrationRotateCounts, setCalibrationRotateCounts] = useState(0)
  const [calibrationPosition, setCalibrationPosition] = useState(CalibrationPosition.LEFT)
  const nextPosition:CalibrationPosition = (calibrationPosition + 1) % 4
  const [calibrationCentreSamples, setCalibrationCentreSamples] = useState<Point[]>([])

  useEffect(() => {
    if (calibrationStage === CalibrationStage.CALIBRATED) return
    const intervalHandle = setInterval(() => {
      const x = adc.readChannel(channelX)
      const y = adc.readChannel(channelY)

      if (calibrationStage === CalibrationStage.ROTATE) {
        setCalibration(produce(calibration, draft => {
          if (x < calibration.min.x) draft.min.x = x
          else if (x > calibration.max.x) draft.max.x = x
          if (y < calibration.min.y) draft.min.y = y
          else if (y > calibration.max.y) draft.max.y = y
        }))

        let currentPosition:CalibrationPosition = null
        if (x < defaultAdcMin) currentPosition = CalibrationPosition.LEFT
        else if (x > defaultAdcMax) currentPosition = CalibrationPosition.RIGHT
        else if (y < defaultAdcMin) currentPosition = CalibrationPosition.UP
        else if (y > defaultAdcMax) currentPosition = CalibrationPosition.DOWN

        if (currentPosition === nextPosition) {
          setCalibrationPosition(currentPosition)
          if (currentPosition === CalibrationPosition.LEFT) {
            const newCalibrationRotateCounts = calibrationRotateCounts + 1
            setCalibrationRotateCounts(newCalibrationRotateCounts)
            if (newCalibrationRotateCounts === CALIBRATION_ROTATE_COUNT) {
              setCalibrateStage(CalibrationStage.CENTER)
            }
          }
        }
      } else {
        if (x > adcResolution * 0.45 && x < adcResolution * 0.55 && y > adcResolution * 0.45 && y < adcResolution * 0.55) {
          const newCalibrationCentreSamples = [...calibrationCentreSamples, { x, y }]
          setCalibrationCentreSamples(newCalibrationCentreSamples)
          // Collect samples for 1 second.
          if (newCalibrationCentreSamples.length === CALIBRATION_CENTRE_COUNT) {
            setCalibration(produce(calibration, draft => {
              draft.centre = {
                x: _.mean(newCalibrationCentreSamples.map(p => p.x)),
                y: _.mean(newCalibrationCentreSamples.map(p => p.y)),
              }
            }))
            setCalibrateStage(CalibrationStage.CALIBRATED)
          }
        } else {
          setCalibrationCentreSamples([])
        }
      }
    }, 1000 / CALIBRATION_SAMPLE_HZ)

    return () => clearInterval(intervalHandle)
  }, [calibrationStage, setCalibrateStage, adc, calibration, setCalibration, nextPosition, setCalibrationPosition, calibrationRotateCounts, setCalibrationRotateCounts, calibrationCentreSamples, setCalibrationCentreSamples, channelX, channelY, defaultAdcMin, defaultAdcMax, adcResolution])

  const updateJoystickState = useMemo(
    () =>
      ({ set }: CallbackInterface) => async () => {
        set(control2DFamily(id), () => {
          const rawX = adc.readChannel(channelX)
          const rawY = adc.readChannel(channelY)
          const x = calcJoystickValue(rawX, calibration.min.x, calibration.centre.x, calibration.max.x)
          const y = calcJoystickValue(rawY, calibration.min.y, calibration.centre.y, calibration.max.y)
          return update2DControlCoords(x, y)
        })
      },
    [id, adc, channelX, channelY, calibration.min.x, calibration.min.y, calibration.centre.x, calibration.centre.y, calibration.max.x, calibration.max.y]
  )

  const updateJoystickCallback = useRecoilCallback(updateJoystickState)
  useEffect(() => {
    if (calibrationStage === CalibrationStage.CALIBRATED) {
      const intervalHandle = setInterval(updateJoystickCallback, 1000 / 25)
      return () => clearInterval(intervalHandle)
    }
  }, [calibration, calibrationStage, updateJoystickCallback])

  const coords = useRecoilValue(control2DFamily(id))

  const classes = useStyles({ coords })

  return (
    <div
      className={classes.root}
    >
      <div className={classes.vertAxis} />
      <div className={classes.horzAxis} />
      <div className={classes.value} />

      { calibrationStage === CalibrationStage.ROTATE && <>
        <div className={classes.calibrate}>
          <FontAwesomeIcon icon={faRedo} size='2x' spin />
        </div>
        <div className={classes.calibrate}>
          {CALIBRATION_ROTATE_COUNT - calibrationRotateCounts}
        </div>
      </> }
      { calibrationStage === CalibrationStage.CENTER && <div className={classes.calibrate}>
        <FontAwesomeIcon icon={faDotCircle} pulse />
      </div> }
    </div>
  )
})
export default Joystick

const calcJoystickValue = (rawValue:number, min:number, centre:number, max:number) => {
  if (rawValue >= centre) {
    return (rawValue - centre) / (max - centre)
  }
  return (rawValue - centre) / (centre - min)
}
