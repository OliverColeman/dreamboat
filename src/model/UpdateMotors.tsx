import React from 'react'
import { useRecoilValue } from 'recoil'
import { downlowController } from '../hardware/downlowController'
import { updateWheels } from '../hardware/driveMotorController'

import { vehicleState } from '../model/state'

/** Updates the motor commands in response to changes in `vehicleState`. */
export default function UpdateMotors () {
  const vehicle = useRecoilValue(vehicleState)
  // Update drive motor outputs.
  updateWheels(vehicle)
  // Update wheel steering angles.
  downlowController.setWheelAngles(vehicle.wheelsNext.map(wheel => wheel.angle))
  return null
}
