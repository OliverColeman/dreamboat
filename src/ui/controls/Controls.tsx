import React, { useCallback, useEffect } from 'react'
import { useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil'
import { Button, makeStyles } from '@material-ui/core'

import { downlowController } from '../../hardware/downlowController'
import { vehicleState, appDimensionsState } from '../../model/state'
import DriveModeSelector from './DriveModeSelector'
import LightingControls from './LightingControls'
import { joystick0, joystick1, controlType, controlVisualSize, simulationMode } from '../../settings'
import { Controls2D, AppDimensionStyleProps } from '../../model/types'
import Joystick from './Joystick'
import { KeyPad, MousePad } from './ControlPad'
import SimulatedEmergencyStopKey from './SimulatedEmergencyStopKey'

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
    lighting: ({ appDimensions }:AppDimensionStyleProps) => ({
      position: 'absolute',
      top: 0,
      // Centred between the joysticks (or the keypad and mouse pad), which occupy controlVisualSize
      // pixels at each top corner.
      left: '50%',
      transform: 'translate(-50%, 0)',
      maxWidth: `calc(100% - ${2 * (controlVisualSize + 16)}px)`,
      zIndex: 10,
    }),
    driveMode: ({ appDimensions }:AppDimensionStyleProps) => ({
      position: 'absolute',
      top: controlVisualSize + 50,
      left: 0,
      zIndex: 10,
    }),
    reset: ({ appDimensions }:AppDimensionStyleProps) => ({
      position: 'absolute',
      bottom: 0,
      left: 0,
      zIndex: 10,
    }),
    brake: ({ appDimensions }:AppDimensionStyleProps) => ({
      position: 'absolute',
      top: controlVisualSize + 50,
      right: 0,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
    }),
    forceHome: () => ({
      marginTop: theme.spacing(1),
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
  const vehicle = useRecoilValue(vehicleState)
  const resetVehicleState = useResetRecoilState(vehicleState)
  const setVehicleState = useSetRecoilState(vehicleState)

  const updateVehicleState = useCallback((reset:boolean) => {
    reset && resetVehicleState()
    setVehicleState(current => ({
      ...current,
      // TODO these don't seem to be necessary
      // centreAbs: { x: 0, y: 0 },
      // rotationPredicted: 0,
    }))
  }, [setVehicleState, resetVehicleState])

  useEffect(
    () => updateVehicleState(false),
    [updateVehicleState]
  )

  // const resetControlKeyPadState = useResetRecoilState(control2DFamily('wasd'))

  const reset = useCallback(() => {
    updateVehicleState(true)
    // resetControlKeyPadState()
  }, [
    updateVehicleState,
    // resetControlKeyPadState
  ])

  const brake = useCallback((brakeEnabled:boolean) => {
    !brakeEnabled && resetVehicleState()
    setVehicleState(current => ({
      ...current,
      brakeEnabled,
    }))
  }, [setVehicleState])

  // Declaring the wheels to be at home also resets the vehicle model, so that the wheel angles the
  // application goes on transmitting match the position just declared. Without it the model would
  // keep asking for the angles the wheels held when the emergency stop was engaged, and every wheel
  // would turn to them at the full steering rate the moment the emergency stop is released.
  const forceHome = useCallback(() => {
    downlowController.declareWheelsAtHome()
    resetVehicleState()
  }, [resetVehicleState])

  const downlow = vehicle.telemetry?.downlow
  // Declaring the wheels to be at their home position is only offered while the emergency stop is
  // engaged: that is when the operator turns the wheels to their home position by hand, and it is
  // the only time the downlow controller acts on the command. A stale emergency stop reading from a
  // controller that has dropped off the universal serial bus (USB) would offer a button that does
  // nothing, so a live connection is required too. It is also not offered while the brake is on,
  // which holds the wheels at the toe-in brake angles rather than at the home position.
  const showForceHome = !!downlow?.isConnected && downlow.emergencyStopTriggered && !vehicle.brakeEnabled

  const appDimensions = useRecoilValue(appDimensionsState)
  const classes = useStyles({ appDimensions })

  return (
    <div className="Controls">
      { simulationMode && <SimulatedEmergencyStopKey /> }
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
      <div className={classes.lighting}>
        <LightingControls />
      </div>
      <div className={classes.driveMode}>
        <DriveModeSelector />
      </div>
      <div className={classes.reset}>
        <Button onClick={reset} variant="outlined">Reset</Button>
      </div>
      <div className={classes.brake}>
        <Button
          onClick={() => brake(!vehicle.brakeEnabled)}
          color="secondary"
          size="large"
          variant={vehicle.brakeEnabled ? 'contained' : 'outlined'}
        >
          Brake
        </Button>
        { showForceHome
          && <Button
              className={classes.forceHome}
              onClick={forceHome}
              size="large"
              variant="outlined"
            >
              Force Home
            </Button>
        }
      </div>
    </div>
  )
}
