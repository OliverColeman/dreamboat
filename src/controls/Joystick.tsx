import React, { useEffect, useMemo } from 'react'
import { makeStyles } from '@material-ui/core'
import { CallbackInterface, useRecoilCallback, useRecoilValue } from 'recoil'

import { control2DFamily } from '../state'
import { Point } from '../types'
import { getADC } from '../hardware/adc'
import { Control2DProps, update2DControlCoords } from './common'
import { controlVisualSize } from '../constants'

export type JoystickProps = Control2DProps & {
  /** ADC channel for X axis. */
  channelX: number
  /** ADC channel for Y axis. */
  channelY: number
}

const pointSize = controlVisualSize / 25

const useStyles = makeStyles(() => ({
  root: {
    backgroundColor: 'grey',
    height: controlVisualSize,
    width: controlVisualSize,
    position: 'relative',
    marginBottom: 8,
  },
  vertAxis: {
    position: 'absolute',
    left: (controlVisualSize - 1) / 2,
    width: 1,
    height: controlVisualSize,
    backgroundColor: '#333',
  },
  horzAxis: {
    position: 'absolute',
    top: (controlVisualSize - 1) / 2,
    width: controlVisualSize,
    height: 1,
    backgroundColor: '#333',
  },
  value: (coords:Point) => ({
    position: 'absolute',
    top: (coords.y / 2 + 0.5) * controlVisualSize - pointSize / 2,
    left: (coords.x / 2 + 0.5) * controlVisualSize - pointSize / 2,
    width: pointSize,
    height: pointSize,
    borderRadius: pointSize / 2,
    backgroundColor: '#00f',
  }),
}))

const Joystick = React.memo(function Joystick (props: JoystickProps) {
  const { id, channelX, channelY } = props

  const adc = useMemo(
    () => {
      const adc = getADC()
      adc.openChannel(channelX)
      adc.openChannel(channelY)
      return adc
    },
    [channelX, channelY]
  )

  const updateJoystickState = useMemo(
    () =>
      ({ snapshot, set }: CallbackInterface) => async () => {
        set(control2DFamily(id), () => {
          const x = adc.readChannel(channelX)
          const y = adc.readChannel(channelY)
          return update2DControlCoords(x, y)
        })
      },
    [adc, id, channelX, channelY]
  )

  const updateJoystickCallback = useRecoilCallback(updateJoystickState)

  useEffect(() => {
    const intervalHandle = setInterval(updateJoystickCallback, 1000 / 25)
    return () => clearInterval(intervalHandle)
  }, [updateJoystickCallback])

  const coords = useRecoilValue(control2DFamily(id))

  const classes = useStyles(coords)

  return (
    <div
      className={classes.root}
    >
      <div className={classes.vertAxis} />
      <div className={classes.horzAxis} />
      <div className={classes.value} />
    </div>
  )
})
export default Joystick
