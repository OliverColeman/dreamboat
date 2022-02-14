import React, { useCallback, useEffect } from 'react'
import { useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil'
import { Button, makeStyles } from '@material-ui/core'

import { control2DFamily, vehicleState, appDimensionsState } from '../../model/state'
import DriveModeSelector from './DriveModeSelector'
import { joystick0, joystick1, controlType, fontSize } from '../../settings'
import { Controls2D, AppDimensionStyleProps } from '../../model/types'
import Joystick from './Joystick'
import { KeyPad, MousePad } from './ControlPad'

const useStyles = makeStyles((theme) =>
  ({
    leftControl: ({ appDimensions }:AppDimensionStyleProps) => ({
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 10,
    }),
    rightControl: ({ appDimensions }:AppDimensionStyleProps) => ({
      position: 'absolute',
      top: 0,
      right: 0,
      zIndex: 10,
    }),
    driveMode: ({ appDimensions }:AppDimensionStyleProps) => ({
      position: 'absolute',
      top: appDimensions.height / 2 - fontSize * 3.3,
      left: 0,
      zIndex: 10,
    }),
    reset: ({ appDimensions }:AppDimensionStyleProps) => ({
      position: 'absolute',
      bottom: 0,
      left: 0,
      zIndex: 10,
    }),
    stats: ({ appDimensions }:AppDimensionStyleProps) => ({
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
    [updateVehicleState]
  )

  const resetControlKeyPadState = useResetRecoilState(control2DFamily('wasd'))

  const reset = useCallback(() => {
    updateVehicleState(true)
    resetControlKeyPadState()
  }, [updateVehicleState, resetControlKeyPadState])

  const appDimensions = useRecoilValue(appDimensionsState)
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
    </div>
  )
}
