import { useEffect } from 'react'
import { CallbackInterface, useRecoilCallback } from 'recoil'

import { frameRate } from '../settings'
import { driveModeState, vehicleState, control2DFamily } from './state'
import { Controls2D } from './types'
import { updateVehicleState } from './reducer'
import { getTelemetry } from '../hardware/telemetry'

/**
 * Iteratively updates the vehicle state (as stored in recoil state) `frameRate` times per second.
 * State updated includes `vehicleState` and `telemetry`.
 */
function UpdateStateLoop () {
  const updateVehicleStateCallback = useRecoilCallback(updateVehicleStateWithCurrentControls)

  useEffect(() => {
    const intervalHandle = setInterval(() => {
      updateVehicleStateCallback()
    }, 1000 / frameRate)
    return () => clearInterval(intervalHandle)
  }, [updateVehicleStateCallback])

  return null
}

const updateVehicleStateWithCurrentControls = ({ snapshot, set }: CallbackInterface) => async () => {
  try {
    const mode = await snapshot.getPromise(driveModeState)
    const control2d = [
      await snapshot.getPromise(control2DFamily(Controls2D.MOTION_0)),
      await snapshot.getPromise(control2DFamily(Controls2D.MOTION_1)),
    ]

    set(vehicleState, updateVehicleState(mode, control2d, getTelemetry()))
  } catch (e) {
    console.log(e)
  }
}

export default UpdateStateLoop
