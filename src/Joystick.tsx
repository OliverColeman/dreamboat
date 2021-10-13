import React, { useCallback, PointerEvent, useEffect } from 'react'
import { makeStyles } from '@material-ui/core'
import { CallbackInterface, useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil'

import { control2DFamily } from './state'
import { constrainRange, getCoordFromPoint, getCoordFromPolar, vecLen } from './util'
import { Point } from './types'
import produce from 'immer'

// Require rpio like this because https://stackoverflow.com/questions/43966353/electron-angular-fs-existssync-is-not-a-function
const rpio = window.require('rpio')
rpio.init({ gpiomem: false })
rpio.spiBegin()
rpio.spiChipSelect(0)
rpio.spiSetClockDivider(12500)

const size = 241
const pointSize = 10

const useStyles = makeStyles(() => ({
  root: {
    backgroundColor: 'grey',
    height: size,
    width: size,
    position: 'relative',
    marginBottom: 8,
  },
  vertAxis: {
    position: 'absolute',
    left: (size - 1) / 2,
    width: 1,
    height: size,
    backgroundColor: '#333',
  },
  horzAxis: {
    position: 'absolute',
    top: (size - 1) / 2,
    width: size,
    height: 1,
    backgroundColor: '#333',
  },
  value: (coords:Point) => ({
    position: 'absolute',
    top: (coords.y / 2 + 0.5) * size - pointSize / 2,
    left: (coords.x / 2 + 0.5) * size - pointSize / 2,
    width: pointSize,
    height: pointSize,
    borderRadius: pointSize / 2,
    backgroundColor: '#00f',
  }),
}))

const Joystick = React.memo(function Joystick () {
  const updateJoystickCallback = useRecoilCallback(updateJoystickState)

  useEffect(() => {
    const intervalHandle = setInterval(updateJoystickCallback, 1000 / 25)
    return () => clearInterval(intervalHandle)
  }, [updateJoystickCallback])

  const coords = useRecoilValue(control2DFamily('joystick0'))

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

const readMCP3008Channel = (channel: number) => {
  const txbuf = Buffer.from([0x01, 0x80 + (channel << 4), 0x00])
  const rxbuf = Buffer.alloc(txbuf.length)
  rpio.spiTransfer(txbuf, rxbuf, txbuf.length)
  const rawValue = ((rxbuf[1] & 0x03) << 8) + rxbuf[2]
  // console.log('rawValue: ', rawValue)
  return rawValue
}

const updateJoystickState = ({ snapshot, set }: CallbackInterface) => async () => {
  set(control2DFamily('joystick0'), () => {
    const y = (readMCP3008Channel(5) / 1023) * -2 + 1
    return updateCoord(0, y)
  })
}

const updateCoord = (x:number, y:number) => {
  x = constrainRange(x, -1, 1)
  y = constrainRange(y, -1, 1)
  let { a, r } = getCoordFromPoint({ x, y })
  r = constrainRange(r, 0, 1)
  return getCoordFromPolar({ a, r })
}
