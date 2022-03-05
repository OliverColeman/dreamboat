import { useEffect } from 'react'
import { CallbackInterface, useRecoilCallback } from 'recoil'

import { frameRate } from '../settings'
import { driveModeState, vehicleState, control2DFamily, telemetryState } from './state'
import { Controls2D } from './types'
import { updateVehicleState } from './reducer'
import { getTelemetry } from '../hardware/telemetry'

function UpdateLoop () {
  const updateVehicleStateCallback = useRecoilCallback(updateVehicleStateWithCurrentControls)
  const updateTelemetryStateCallback = useRecoilCallback(updateTelemetryState)

  useEffect(() => {
    const intervalHandle = setInterval(() => {
      updateTelemetryStateCallback()
      updateVehicleStateCallback()
    }, 1000 / frameRate)
    return () => clearInterval(intervalHandle)
  }, [updateTelemetryStateCallback, updateVehicleStateCallback])

  return null
}

const updateTelemetryState = ({ set }: CallbackInterface) => async () => {
  try {
    set(telemetryState, getTelemetry())
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
