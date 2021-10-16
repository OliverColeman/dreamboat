import React, { useEffect } from 'react'
import { makeStyles } from '@material-ui/core'
import { CallbackInterface, useRecoilCallback, useRecoilValue } from 'recoil'

import { control2DFamily } from './state'
import { constrainRange, getCoordFromPoint, getCoordFromPolar } from './util'
import { Point } from './types'
import { mcp3008Monitor } from './hardware'

const getMCP3008Value = mcp3008Monitor({ channels: [0, 1, 2, 3] })

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

const updateJoystickState = ({ snapshot, set }: CallbackInterface) => async () => {
  set(control2DFamily('joystick0'), () => {
    const y = getMCP3008Value(0) * 2 - 1
    const x = getMCP3008Value(1) * 2 - 1
    return updateCoord(x, y)
  })
}

// const getADCReading = (channel: number) => {
//   const linearValue = getMCP3008Value(channel) * 2 - 1 // [-1, 1]
//   return linearValue ** 2 * Math.sign(linearValue)
// }

const updateCoord = (x:number, y:number) => {
  x = constrainRange(x, -1, 1)
  y = constrainRange(y, -1, 1)
  let { a, r } = getCoordFromPoint({ x, y })
  // Non-linear for soft-start
  r = constrainRange(r ** 2, 0, 1)
  return getCoordFromPolar({ a, r })
}
