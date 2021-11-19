import React, { useCallback, useEffect } from 'react'
import { useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil'
import { Box, Button, makeStyles } from '@material-ui/core'

import { control2DFamily, vehicleState, appDimensionsState } from '../../model/state'
import DriveModeSelector from './DriveModeSelector'
import { rad2Deg } from '../../util'
import { joystick0, joystick1, controlType, fontSize } from '../../settings'
import { Controls2D, Dimensions } from '../../model/types'
import Joystick from './Joystick'
import { KeyPad, MousePad } from './ControlPad'

type StyleProps = {
  appDimensions:Dimensions
}

const useStyles = makeStyles((theme) =>
  ({
    leftControl: ({ appDimensions }:StyleProps) => ({
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 10,
    }),
    rightControl: ({ appDimensions }:StyleProps) => ({
      position: 'absolute',
      top: 0,
      right: 0,
      zIndex: 10,
    }),
    driveMode: ({ appDimensions }:StyleProps) => ({
      position: 'absolute',
      top: appDimensions.height / 2 - fontSize * 3.3,
      left: 0,
      zIndex: 10,
    }),
    reset: ({ appDimensions }:StyleProps) => ({
      position: 'absolute',
      bottom: 0,
      left: 0,
      zIndex: 10,
    }),
    stats: ({ appDimensions }:StyleProps) => ({
      position: 'absolute',
      bottom: 0,
      right: 0,
      zIndex: 10,
      fontSize: '16px',
      width: 300,
      overflowX: 'hidden',
    }),
  })
)

export default function Controls () {
  const appDimensions = useRecoilValue(appDimensionsState)

  const resetVehicleState = useResetRecoilState(vehicleState)
  const setVehicleState = useSetRecoilState(vehicleState)

  const updateVehicleState = useCallback((reset:boolean) => {
    reset && resetVehicleState()
    setVehicleState(current => ({
      ...current,
      centreAbs: { x: 0, y: 0 },
      rotationPredicted: 0,
    }))
  }, [setVehicleState, resetVehicleState])

  useEffect(
    () => updateVehicleState(false),
    [updateVehicleState, appDimensions]
  )

  const resetControlKeyPadState = useResetRecoilState(control2DFamily('wasd'))

  const reset = useCallback(() => {
    updateVehicleState(true)
    resetControlKeyPadState()
  }, [updateVehicleState, resetControlKeyPadState])

  const classes = useStyles({ appDimensions })

  return (
    <div className="Controls">
      <div className={classes.leftControl}>
        { controlType === 'joystick'
          ? <Joystick id={Controls2D.MOTION_0} {...joystick0} />
          : <KeyPad id={Controls2D.MOTION_0} />
        }
      </div>
      <div className={classes.rightControl}>
        { controlType === 'joystick'
          ? <Joystick id={Controls2D.MOTION_1} {...joystick1} />
          : <MousePad id={Controls2D.MOTION_1} />
        }
      </div>
      <div className={classes.driveMode}>
        <DriveModeSelector />
      </div>
      <div className={classes.reset}>
        <Button onClick={reset}>Reset</Button>
      </div>
      <div className={classes.stats}>
        <Stats/>
      </div>
    </div>
  )
}

const Stats = () => {
  const vehicle = useRecoilValue(vehicleState)
  const control2d = [
    useRecoilValue(control2DFamily(Controls2D.MOTION_0)),
    useRecoilValue(control2DFamily(Controls2D.MOTION_1)),
  ]

  const stats = [
    ['speed', vehicle.speedPredicted, null, 'Predicted speed'],
    ['rotation', formatAngle(vehicle.rotationPredicted), null, 'Predicted rotation'],
    ['pivot c', vehicle.pivot.x.toFixed(0), vehicle.pivot.y.toFixed(0), 'Current relative pivot point coordinates'],
    ['pivot p', formatAngle(vehicle.pivot.a), vehicle.pivot.r.toFixed(0), 'Current relative pivot point coordinates polar'],
    ['location', vehicle.centreAbs.x.toFixed(0), vehicle.centreAbs.y.toFixed(0), 'Predicted absolute vehicle center coordinates'],
    ...control2d.map((c, i) => [
      `control${i}`, formatAngle(c.a), formatMagnitude(c.r), `Control ${i} angle and magnitude`,
    ]),
    ...vehicle.wheels.map((w, i) => [
      `w${i}`, `${formatAngle(w.rotation, 0)} ${w.flipped ? 'F' : ''}`, w.speed.toFixed(1), `Wheel ${i}`,
    ]),
  ]

  return (
    <Box display="grid" gridTemplateColumns="1fr 1fr 1fr">
      {stats.map((row, ri) => row.slice(0, 3).map((v, ci) =>
        <Box width={75} key={`${ri}-${ci}`}>
          <span title={'' + row[3]}>{v}</span>
        </Box>
      ))}
    </Box>
  )
}

const formatAngle = (a:number, precision:number = 1) => `${rad2Deg(a).toFixed(precision)}°`
const formatMagnitude = (v:number) => `${(v * 100).toFixed(0)}%`
