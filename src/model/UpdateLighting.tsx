import React from 'react'
import { useRecoilValue } from 'recoil'
import { downlowController } from '../hardware/downlowController'

import { lightingState } from '../model/state'

/** Updates the lighting commands in response to changes in `lightingState`. */
export default function UpdateLighting () {
  const lighting = useRecoilValue(lightingState)
  downlowController.updateLighting(lighting)
  return null
}
