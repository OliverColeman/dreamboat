import React from 'react'
import { useRecoilValue } from 'recoil'
import { updateWheels } from '../hardware/motor'

import { vehicleState } from '../model/state'

export default function UpdateMotors () {
  const vehicle = useRecoilValue(vehicleState)

  updateWheels(vehicle)
  return null
}
