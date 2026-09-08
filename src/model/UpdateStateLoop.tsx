import { useEffect } from 'react'
import { CallbackInterface, useRecoilCallback } from 'recoil'

import { frameRate } from '../settings'
import { driveModeState, vehicleState, control2DFamily } from './state'
import { Controls2D } from './types'
import { updateVehicleState } from './reducer'
import { getTelemetry } from '../hardware/telemetry'
import { appendTelemetryLogRow } from '../hardware/telemetryLog'

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

/** Counts iterations of the update loop, so that each contributes one telemetry log row. */
let iteration = 0

const updateVehicleStateWithCurrentControls = ({ snapshot, set }: CallbackInterface) => async () => {
  try {
    const mode = await snapshot.getPromise(driveModeState)
    const control2d = [
      await snapshot.getPromise(control2DFamily(Controls2D.MOTION_0)),
      await snapshot.getPromise(control2DFamily(Controls2D.MOTION_1)),
    ]

    const updateForThisIteration = updateVehicleState(mode, control2d, getTelemetry())
    const thisIteration = ++iteration
    // Updating through a function rather than a value so that a brake or reset applied from the
    // controls between reading the state and writing it is not lost.
    set(vehicleState, current => {
      const updated = updateForThisIteration(current)
      appendTelemetryLogRow(updated, control2d, mode, thisIteration)
      return updated
    })
  } catch (e) {
    console.log(e)
  }
}

export default UpdateStateLoop
