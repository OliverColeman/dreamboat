import React, { useCallback, PointerEvent } from 'react'
import { makeStyles } from '@material-ui/core'
import { useRecoilState } from 'recoil'
import { useHotkeys } from 'react-hotkeys-hook'

import { control2DFamily } from '../../model/state'
import { Point } from '../../model/types'
import { Control2DProps, update2DControlCoords } from './common'

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

export const MousePad = React.memo(function MousePad (props: Control2DProps) {
  const [coords, setCoords] = useRecoilState(control2DFamily(props.id))

  const pointerMoveHandler = useCallback((e: PointerEvent<HTMLDivElement>) => {
    // Get relative mouse coordinates scaled to [-1, 1]
    const x = ((e.clientX - e.currentTarget.offsetLeft) / e.currentTarget.clientWidth) * 2 - 1
    const y = ((e.clientY - e.currentTarget.offsetTop) / e.currentTarget.clientHeight) * 2 - 1
    setCoords(update2DControlCoords(x, y))
  }, [setCoords])

  const classes = useStyles(coords)

  return (
    <div
      className={classes.root}
      onPointerMove={pointerMoveHandler}
      onPointerLeave={() => setCoords(update2DControlCoords(0, 0))}
    >
      <div className={classes.vertAxis} />
      <div className={classes.horzAxis} />
      <div className={classes.value} />
    </div>
  )
})

export const KeyPad = React.memo(function KeyPad (props: Control2DProps) {
  const [c, setCoords] = useRecoilState(control2DFamily(props.id))

  useHotkeys('w', () => setCoords(c => update2DControlCoords(c.x, c.y - 0.05)))
  useHotkeys('x', () => setCoords(c => update2DControlCoords(c.x, c.y + 0.05)))
  useHotkeys('a', () => setCoords(c => update2DControlCoords(c.x - 0.05, c.y)))
  useHotkeys('d', () => setCoords(c => update2DControlCoords(c.x + 0.05, c.y)))
  useHotkeys('s', () => setCoords(c => update2DControlCoords(0, 0)))

  // useHotkeys('s', () => setCoords(c => getCoordFromPoint({ ...c, y: Math.min(1, c.y + 0.05) })))
  // useHotkeys('a', () => setCoords(c => getCoordFromPoint({ ...c, x: Math.max(-1, c.x - 0.05) })))
  // useHotkeys('d', () => setCoords(c => getCoordFromPoint({ ...c, x: Math.min(1, c.x + 0.05) })))

  const classes = useStyles(c)

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
