import React from 'react'
import { useRecoilValue } from 'recoil'
import { downlowController } from '../hardware/downlowController'

import { vehicleState } from '../model/state'

/** Updates the motor commands in response to changes in `vehicleState`. */
export default function UpdateMotors () {
  const vehicle = useRecoilValue(vehicleState)
  downlowController.updateWheelAnglesAndDriveRate(vehicle.wheelsNext)
  return null
}
