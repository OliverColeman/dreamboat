import React, { useCallback, PointerEvent } from 'react'
import { makeStyles } from '@material-ui/core'
import { atomFamily, useRecoilState } from 'recoil'
import { useHotkeys } from 'react-hotkeys-hook'

import { control2DFamily } from '../../model/state'
import { Point } from '../../model/types'
import { Control2DProps, update2DControlCoords } from './common'
import { controlVisualSize } from '../../settings'

const size = controlVisualSize
const pointSize = controlVisualSize / 12

type StyleProps = {
  controlCoords: Point
  appliedCoords: Point
}

const useStyles = makeStyles(() => ({
  root: {
    backgroundColor: 'grey',
    height: size,
    width: size,
    position: 'relative',
    marginBottom: 8,
  },
  label: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translate(-50%, 0)',
    fontSize: 14,
    color: '#000',
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
  applied: ({ controlCoords, appliedCoords }: StyleProps) => ({
    position: 'absolute',
    top: (appliedCoords.y / 2 + 0.5) * size - pointSize / 2,
    left: (appliedCoords.x / 2 + 0.5) * size - pointSize / 2,
    width: pointSize,
    height: pointSize,
    borderRadius: pointSize / 2,
    backgroundColor: '#00f',
  }),
  control: ({ controlCoords, appliedCoords }: StyleProps) => ({
    position: 'absolute',
    top: (controlCoords.y / 2 + 0.5) * size - pointSize / 2,
    left: (controlCoords.x / 2 + 0.5) * size - pointSize / 2,
    width: pointSize,
    height: pointSize,
    borderRadius: pointSize / 2,
    backgroundColor: '#999',
  }),
}))

const mouseControlFamily = atomFamily<Point, string>({
  key: 'mouseControl',
  default: { x: 0, y: 0 },
})

export const MousePad = React.memo(function MousePad (props: Control2DProps) {
  const [appliedCoords, setAppliedCoords] = useRecoilState(control2DFamily(props.id))
  const [controlCoords, setControlCoords] = useRecoilState(mouseControlFamily(props.id))

  const pointerMoveHandler = useCallback((e: PointerEvent<HTMLDivElement>) => {
    // Get relative mouse coordinates scaled to [-1, 1]
    const currentTargetRect = e.currentTarget.getBoundingClientRect()
    const eventOffsetX = e.pageX - currentTargetRect.left
    const eventOffsetY = e.pageY - currentTargetRect.top
    const x = (eventOffsetX / currentTargetRect.width) * 2 - 1
    const y = (eventOffsetY / currentTargetRect.height) * 2 - 1
    setControlCoords({ x, y })
    setAppliedCoords(update2DControlCoords(x, y))
  }, [setAppliedCoords])

  const classes = useStyles({ controlCoords, appliedCoords })

  return (
    <div
      className={classes.root}
      onPointerMove={pointerMoveHandler}
      onPointerLeave={() => {
        setControlCoords({ x: 0, y: 0 })
        setAppliedCoords(update2DControlCoords(0, 0))
      }}
    >
      <div className={classes.label}>Mouse</div>
      <div className={classes.vertAxis} />
      <div className={classes.horzAxis} />
      <div className={classes.control} />
      <div className={classes.applied} />
    </div>
  )
})

const keyPadControlFamily = atomFamily<Point, string>({
  key: 'keyPadControl',
  default: { x: 0, y: 0 },
})

export const KeyPad = React.memo(function KeyPad (props: Control2DProps) {
  const [appliedCoords, setAppliedCoords] = useRecoilState(control2DFamily(props.id))
  const [controlCoords, setControlCoords] = useRecoilState(keyPadControlFamily(props.id))

  useHotkeys('w', () => {
    const newControlCoords = { x: controlCoords.x, y: Math.max(-1, controlCoords.y - 0.05) }
    setControlCoords(newControlCoords)
    setAppliedCoords(update2DControlCoords(newControlCoords.x, newControlCoords.y))
  }, [controlCoords, setControlCoords, setAppliedCoords])
  useHotkeys('x', () => {
    const newControlCoords = { x: controlCoords.x, y: Math.min(1, controlCoords.y + 0.05) }
    setControlCoords(newControlCoords)
    setAppliedCoords(update2DControlCoords(newControlCoords.x, newControlCoords.y))
  }, [controlCoords, setControlCoords, setAppliedCoords])
  useHotkeys('a', () => {
    const newControlCoords = { x: Math.max(-1, controlCoords.x - 0.05), y: controlCoords.y }
    setControlCoords(newControlCoords)
    setAppliedCoords(update2DControlCoords(newControlCoords.x, newControlCoords.y))
  }, [controlCoords, setControlCoords, setAppliedCoords])
  useHotkeys('d', () => {
    const newControlCoords = { x: Math.min(1, controlCoords.x + 0.05), y: controlCoords.y }
    setControlCoords(newControlCoords)
    setAppliedCoords(update2DControlCoords(newControlCoords.x, newControlCoords.y))
  }, [controlCoords, setControlCoords, setAppliedCoords])
  useHotkeys('s', () => {
    setControlCoords({ x: 0, y: 0 })
    setAppliedCoords(update2DControlCoords(0, 0))
  }, [setControlCoords, setAppliedCoords])

  const classes = useStyles({ controlCoords, appliedCoords })

  return (
    <div
      className={classes.root}
    >
      <div className={classes.label}>Keypad</div>
      <div className={classes.vertAxis} />
      <div className={classes.horzAxis} />
      <div className={classes.control} />
      <div className={classes.applied} />
    </div>
  )
})
