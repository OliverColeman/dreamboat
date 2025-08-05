import React from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Group, Line, Circle, Text, Arrow } from 'react-konva'
import { useRecoilValue } from 'recoil'
import Color from 'color'

import { appDimensionsState, driveModeState, vehicleState } from '../model/state'
import { Theme, makeStyles, useTheme } from '@material-ui/core'
import { bedSize, gridSpacing, maxVehicleSpeed, visualScale as scale, wheelDiameter, wheelPositions } from '../settings'
import { DriveMode, Coord, VehicleState, Polar } from '../model/types'

Konva.angleDeg = false

const useStyles = makeStyles<Theme>((theme) => ({
  root: {
    flexGrow: 1,
  },
  emergencyStop: () => ({
    color: theme.palette.error.main,
    position: 'absolute',
    top: '50%',
    left: '50%',
    padding: '10px',
    backgroundColor: theme.palette.background.default,
    borderWidth: '2px',
    borderColor: theme.palette.error.main,
    transform: 'translate(-50%,-50%)',
    zIndex: 20,
    fontSize: '64px',
  }),
}))

export default function Visualisation () {
  const vehicle = useRecoilValue(vehicleState)
  const { width, height } = useRecoilValue(appDimensionsState)
  const driveMode = useRecoilValue(driveModeState)

  const widthScaled = width / scale
  const heightScaled = height / scale

  const theme = useTheme()
  const classes = useStyles()
  const colourForward = Color(theme.palette.success.main)
  const colourReverse = Color(theme.palette.warning.main)
  const colourStopped = Color.rgb(95, 95, 95)

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
    length={bedSize.height * 2.2}
    colour={theme.palette.secondary.main}
  />

  return (
    <div className={classes.root}>
      { vehicle.telemetry && vehicle.telemetry.downlow.emergencyStopTriggered && <div className={classes.emergencyStop}>
        ! E-Stop !
      </div> }

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

            { vehicle.telemetry && vehicle.telemetry.downlow.wheels.map((wheel, idx) =>
              <Group
                key={`wheel-${idx}`}
                {...wheelPositions[idx]}
              >
                <Wheel
                  key={idx}
                  index={idx}
                  actual={{ r: wheel.driveRate * 100, a: wheel.angle }}
                  target={{ r: vehicle.wheelsTarget[idx].speed / maxVehicleSpeed, a: vehicle.wheelsTarget[idx].angle }}
                  colourStopped={colourStopped} colourForward={colourForward} colourReverse={colourReverse}
                />
              </Group>
            )}

            <Line
              points={[vehicle.pivotTarget.x, vehicle.pivotTarget.y, vehicle.pivot.x, vehicle.pivot.y]}
              stroke="green" strokeWidth={0.5 / scale}
            />

            <Pivot pivot={vehicle.pivotTarget} label="T" colour={Color(theme.palette.warning.main).fade(0.5).toString()} />
            <Pivot pivot={vehicle.pivot} label="C" colour={theme.palette.warning.main} />
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}

type WheelVisProps = { index: number, actual: Polar, target: Polar, colourStopped:Color, colourForward:Color, colourReverse:Color }
const Wheel:React.FC<WheelVisProps> = ({ index, actual, target, colourStopped, colourForward, colourReverse }) => (
  <>
    <Circle
      radius={wheelDiameter / 2}
      fill='black'
    />
    { [actual, target].map((w, i) => {
      let colour = colourStopped
      // Note speed is in mm/s.
      if (w.r > 3) colour = colour.mix(colourForward, w.r)
      else if (w.r < -3) colour = colour.mix(colourReverse, -w.r)
      if (i === 1) colour = colour.fade(0.5)
      return <Direction
        rotation={w.a}
        length={wheelDiameter}
        colour={colour.toString()}
        key={i}
      />
    }) }

    <Text
      text={'' + index} fontSize={150} fill="white"
      x={-40} y={-60 - wheelDiameter * 0.8 * Math.sign(wheelPositions[index].y)}
    />
  </>
)

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

type DirectionProps = {
  colour: string
  rotation?: number
  length: number
}
const Direction:React.FC<DirectionProps> = ({ rotation, length, colour }) => (
  <Arrow
    rotation={rotation ?? 0}
    points={[0, length * 0.5, 0, -length * 0.45]}
    fill={colour}
    stroke={colour}
    strokeWidth={length / 10}
    pointerLength={length / 8}
    pointerWidth={length / 6}
  />
)
