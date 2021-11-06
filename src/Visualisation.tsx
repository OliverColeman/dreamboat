import React from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Group, Line, Circle, Text, Arrow } from 'react-konva'
import { useRecoilValue } from 'recoil'

import { appDimensionsState, driveModeState, vehicleState } from './state'
import { makeStyles, useTheme } from '@material-ui/core'
import { bedSize, DriveMode, gridSpacing, visualScale as scale, wheelDiameter, wheelPositions, wheelWidth } from './constants'
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

  const gridlines = []
  for (let x = -widthScaled; x < widthScaled; x += gridSpacing) {
    gridlines.push(
      <Line key={'gv' + x} points={[x, -heightScaled, x, heightScaled]} stroke="grey" strokeWidth={0.5 / scale} />
    )
  }
  for (let y = -heightScaled; y < heightScaled; y += gridSpacing) {
    gridlines.push(
      <Line key={'gh' + y} points={[-widthScaled, y, widthScaled, y]} stroke="grey" strokeWidth={0.5 / scale} />
    )
  }

  const forwardRefArrow = <Arrow
    points={[0, bedSize.height, 0, -bedSize.height]}
    fill={theme.palette.secondary.main}
    stroke={theme.palette.secondary.main}
    strokeWidth={6 / scale}
    pointerLength={bedSize.height / 6}
    pointerWidth={bedSize.height / 6}
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
            <Circle offsetY={bedSize.height / 2} radius={100} fill="orange" />
            <Rect
              width={bedSize.width}
              height={bedSize.height}
              offsetX={bedSize.width / 2}
              offsetY={bedSize.height / 2}
              fill="#098"
            />

            { vehicle.wheels.map((wheel, idx) =>
              <Group
                key={`wheel-${idx}`}
                {...wheelPositions[idx]}
              >
                <Wheel
                  state={wheel}
                  colour="rgba(63, 63, 63, 1)"
                />
                <Wheel
                  state={vehicle.wheelsTarget[idx]}
                  colour="rgba(63, 63, 63, 0.5)"
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

            <Pivot pivot={vehicle.pivotTarget} label="T" />
            <Pivot pivot={vehicle.pivot} label="C" />
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}

type PivotProps = {pivot:Coord, label: string}
const Pivot:React.FC<PivotProps> = ({ pivot, label }) => (<>
  <Line
    points={[0, 0, pivot.x, pivot.y]}
    stroke="blue" strokeWidth={0.5 / scale}
  />
  <Circle
    x={pivot.x}
    y={pivot.y}
    radius={100}
    stroke="blue"
    strokeWidth={2 / scale}
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
  <Group
    rotation={state.rotation}
  >
    <Circle offsetY={wheelDiameter / 2} radius={wheelWidth / 2} fill="orange" />
    <Rect
      width={wheelWidth}
      height={wheelDiameter}
      offsetX={wheelWidth / 2}
      offsetY={wheelDiameter / 2}
      fill={colour}
    />
  </Group>
)
