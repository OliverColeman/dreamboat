import React, { useEffect } from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Group, Line, Circle, Text } from 'react-konva'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useMeasure } from 'react-use'

import { vehicleState, visualisationDimensionsState } from './state'
import { makeStyles } from '@material-ui/core'
import { bedSize, visualScale as scale, visualScale, wheelDiameter, wheelPositions, wheelWidth } from './constants'
import { Coord, WheelState } from './types'

Konva.angleDeg = false

const useStyles = makeStyles(() => ({
  root: {
    flexGrow: 1,
  },
}))

export default function Visualisation () {
  const setVisualisationDimensionsState = useSetRecoilState(visualisationDimensionsState)
  const vehicle = useRecoilValue(vehicleState)

  const [ref, { width, height }] = useMeasure()

  useEffect(
    () => setVisualisationDimensionsState({ width: width / visualScale, height: height / visualScale }),
    [setVisualisationDimensionsState, width, height]
  )

  const classes = useStyles()

  const gridlines = []
  for (let x = 0; x < width / scale; x += 1000) {
    gridlines.push(
      <Line key={'gv' + x} points={[x, 0, x, height / scale]} stroke="grey" strokeWidth={0.5 / scale} />
    )
  }
  for (let y = 0; y < height / scale; y += 1000) {
    gridlines.push(
      <Line key={'gh' + y} points={[0, y, width / scale, y]} stroke="grey" strokeWidth={0.5 / scale} />
    )
  }

  return (
    // @ts-ignore
    <div className={classes.root} ref={ref}>
      <Stage width={width} height={height} scaleX={scale} scaleY={scale}>
        <Layer>
          { gridlines }

          <Group
            {...vehicle.centreAbs}
            rotation={vehicle.rotationPredicted}
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
