import React from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Group, Line, Circle, Text, Arrow } from 'react-konva'
import { useRecoilValue } from 'recoil'
import Color from 'color'

import { appDimensionsState, driveModeState, vehicleState } from './state'
import { makeStyles, useTheme } from '@material-ui/core'
import { bedSize, DriveMode, gridSpacing, visualScale as scale, wheelDiameter, wheelPositions } from './constants'
import { Coord, WheelState } from './types'

Konva.angleDeg = false

const useStyles = makeStyles(() => ({
  root: {
    flexGrow: 1,
  },
}))

export default function Visualisation () {
  const vehicle = useRecoilValue(vehicleState)
  const { width, height } = useRecoilValue(appDimensionsState)
  const driveMode = useRecoilValue(driveModeState)

  const widthScaled = width / scale
  const heightScaled = height / scale

  const theme = useTheme()
  const classes = useStyles()

  const gridExtent = Math.round(Math.max(widthScaled, heightScaled) / gridSpacing) * gridSpacing

  const gridlines = []
  for (let x = -gridExtent; x <= gridExtent; x += gridSpacing) {
    gridlines.push(
      <Line key={'gv' + x} points={[x, -gridExtent, x, gridExtent]} stroke={theme.palette.success.main} strokeWidth={2 / scale} />
    )
  }
  for (let y = -gridExtent; y <= gridExtent; y += gridSpacing) {
    gridlines.push(
      <Line key={'gh' + y} points={[-gridExtent, y, gridExtent, y]} stroke={theme.palette.success.main} strokeWidth={2 / scale} />
    )
  }

  const forwardRefArrow = <Direction
    length={bedSize.height * 2}
    colour={theme.palette.secondary.main}
  />

  return (
    <div className={classes.root}>
      <Stage width={width} height={height} scaleX={scale} scaleY={scale} offsetX={-widthScaled / 2} offsetY={-heightScaled / 2}>
        <Layer>
          <Group
            rotation={-vehicle.rotationPredicted}
          >
            <Group
              offsetX={vehicle.centreAbs.x % gridSpacing}
              offsetY={vehicle.centreAbs.y % gridSpacing}
            >
              { gridlines }

            </Group>

            { driveMode === DriveMode.DAY_TRIPPER && forwardRefArrow }
          </Group>

          { driveMode !== DriveMode.DAY_TRIPPER && forwardRefArrow }

          <Group
            // {...vehicle.centreAbs}
            // rotation={vehicle.rotationPredicted}
          >
            <Rect
              width={bedSize.width}
              height={bedSize.height}
              offsetX={bedSize.width / 2}
              offsetY={bedSize.height / 2}
              fill={theme.palette.primary.main}
            />

            { vehicle.wheels.map((wheel, idx) =>
              <Group
                key={`wheel-${idx}`}
                {...wheelPositions[idx]}
              >
                <Wheel
                  state={wheel}
                  colour={theme.palette.warning.main}
                />
                <Wheel
                  state={vehicle.wheelsTarget[idx]}
                  colour={Color(theme.palette.warning.main).fade(0.5)}
                />
                <Text
                  text={'' + idx} fontSize={150} fill="white"
                  x={-40} y={-55}
                />
              </Group>
            )}

            <Line
              points={[vehicle.pivotTarget.x, vehicle.pivotTarget.y, vehicle.pivot.x, vehicle.pivot.y]}
              stroke="green" strokeWidth={0.5 / scale}
            />

            <Pivot pivot={vehicle.pivotTarget} label="T" colour={Color(theme.palette.warning.main).fade(0.5)} />
            <Pivot pivot={vehicle.pivot} label="C" colour={theme.palette.warning.main} />
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}

type PivotProps = {pivot:Coord, label: string, colour: string}
const Pivot:React.FC<PivotProps> = ({ pivot, label, colour }) => (<>
  <Line
    points={[0, 0, pivot.x, pivot.y]}
    stroke={colour} strokeWidth={3 / scale}
  />
  <Circle
    x={pivot.x}
    y={pivot.y}
    radius={100}
    stroke={colour}
    strokeWidth={3 / scale}
  />
  <Text
    text={label}
    fontSize={150} fill="white"
    x={pivot.x - 45}
    y={pivot.y - 60}
  />
</>)

type WheelProps = {state:WheelState, colour: string}
const Wheel:React.FC<WheelProps> = ({ state, colour }) => (
  <Direction
    rotation={state.rotation}
    length={wheelDiameter}
    colour={colour}
  />
)

type DirectionProps = {
  colour: string
  rotation?: number
  length: number
}
const Direction:React.FC<DirectionProps> = ({ rotation, length, colour }) => (
  <Arrow
    rotation={rotation ?? 0}
    points={[0, length / 2, 0, -length / 2]}
    fill={colour}
    stroke={colour}
    strokeWidth={length / 15}
    pointerLength={length / 7.5}
    pointerWidth={length / 7.5}
  />
)
