import { useEffect } from 'react'
import { CallbackInterface, useRecoilCallback } from 'recoil'
import _ from 'lodash'

import { frameRate } from '../settings'
import { driveModeState, vehicleState, control2DFamily, motorControllerState } from './state'
import { Controls2D } from './types'
import { updateVehicleState } from './reducer'
import { getMotorControllerState } from '../hardware/motor'

function UpdateLoop () {
  const updateVehicleStateCallback = useRecoilCallback(updateVehicleStateWithCurrentControls)
  const updateMotorControllerStateCallback = useRecoilCallback(updateMotorControllerState)

  useEffect(() => {
    const intervalHandle = setInterval(() => {
      updateMotorControllerStateCallback()
      updateVehicleStateCallback()
    }, 1000 / frameRate)
    return () => clearInterval(intervalHandle)
  }, [updateMotorControllerStateCallback, updateVehicleStateCallback])

  return null
}

const updateMotorControllerState = ({ set }: CallbackInterface) => async () => {
  try {
    set(motorControllerState, getMotorControllerState())
  } catch (e) {
    console.log(e)
  }
}

const updateVehicleStateWithCurrentControls = ({ snapshot, set }: CallbackInterface) => async () => {
  try {
    const mode = await snapshot.getPromise(driveModeState)
    const control2d = [
      await snapshot.getPromise(control2DFamily(Controls2D.MOTION_0)),
      await snapshot.getPromise(control2DFamily(Controls2D.MOTION_1)),
    ]

    set(vehicleState, updateVehicleState(mode, control2d))
  } catch (e) {
    console.log(e)
  }
}

export default UpdateLoop
