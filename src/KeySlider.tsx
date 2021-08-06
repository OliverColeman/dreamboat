import React from 'react'
import { Slider } from '@material-ui/core'
import { useRecoilState } from 'recoil'

import { control1DState } from './state'
import { useHotkeys } from 'react-hotkeys-hook'

export default React.memo(function KeySlider () {
  const [position, setPosition] = useRecoilState(control1DState)

  useHotkeys('q', () => setPosition(currPos => Math.max(-1, currPos - 0.1)))
  useHotkeys('e', () => setPosition(currPos => Math.min(1, currPos + 0.1)))

  return (
    <Slider value={position} min={-1} max={1} />
  )
})
