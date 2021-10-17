import React, { useCallback, useEffect } from 'react'
import { useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil'
import { Box, Button } from '@material-ui/core'

import { control2DFamily, driveModeState, vehicleState, visualisationDimensionsState } from '../state'
import DriveModeSelector from './DriveModeSelector'
import { rad2Deg } from '../util'
import { Controls2D, control0, control1 } from '../constants'

export default function Controls () {
  const visualisationDimensions = useRecoilValue(visualisationDimensionsState)

  const resetVehicleState = useResetRecoilState(vehicleState)
  const setVehicleState = useSetRecoilState(vehicleState)

  const updateVehicleState = useCallback((reset:boolean) => {
    reset && resetVehicleState()
    setVehicleState(current => ({
      ...current,
      centreAbs: { x: visualisationDimensions.width / 2, y: visualisationDimensions.height / 2 },
    }))
  }, [visualisationDimensions, setVehicleState, resetVehicleState])

  useEffect(
    () => updateVehicleState(false),
    [updateVehicleState, visualisationDimensions]
  )

  const resetControlKeyPadState = useResetRecoilState(control2DFamily('wasd'))
  const resetDriveMode = useResetRecoilState(driveModeState)

  const reset = useCallback(() => {
    updateVehicleState(true)
    resetControlKeyPadState()
    resetDriveMode()
  }, [updateVehicleState, resetControlKeyPadState, resetDriveMode])

  const Control0 = control0.component
  const Control1 = control1.component

  return (
    <div className="Controls">
      {/* <KeyPad /> */}
      <Control0 id={Controls2D.MOTION_0} {...control0.props} />
      <Control1 id={Controls2D.MOTION_1} {...control1.props} />
      <DriveModeSelector />
      <Button onClick={reset}>Reset</Button>
      <Stats/>
    </div>
  )
}

const Stats = () => {
  const vehicle = useRecoilValue(vehicleState)
  const control2d = [
    useRecoilValue(control2DFamily(Controls2D.MOTION_0)),
    useRecoilValue(control2DFamily(Controls2D.MOTION_1)),
  ]

  const stats = [
    ['speed', vehicle.speedPredicted, null, 'Predicted speed'],
    ['rotation', formatAngle(vehicle.rotationPredicted), null, 'Predicted rotation'],
    ['pivot c', vehicle.pivot.x.toFixed(0), vehicle.pivot.y.toFixed(0), 'Current relative pivot point coordinates'],
    ['pivot p', formatAngle(vehicle.pivot.a), vehicle.pivot.r.toFixed(0), 'Current relative pivot point coordinates polar'],
    ['location', vehicle.centreAbs.x.toFixed(0), vehicle.centreAbs.y.toFixed(0), 'Predicted absolute vehicle center coordinates'],
    ...control2d.map((c, i) => [
      `control${i}`, formatAngle(c.a), formatMagnitude(c.r), `Control ${i} angle and magnitude`,
    ]),
    ...vehicle.wheels.map((w, i) => [
      `w${i}`, `${formatAngle(w.rotation, 0)} ${w.flipped ? 'F' : ''}`, w.speed.toFixed(1), `Wheel ${i}`,
    ]),
  ]

  return (
    <Box display="grid" gridTemplateColumns="2fr 1fr 1fr">
      {stats.map((row, ri) => row.slice(0, 3).map((v, ci) =>
        <Box key={`${ri}-${ci}`}>
          <span title={'' + row[3]}>{v}</span>
        </Box>
      ))}
    </Box>
  )
}

const formatAngle = (a:number, precision:number = 1) => `${rad2Deg(a).toFixed(precision)}°`
const formatMagnitude = (v:number) => `${(v * 100).toFixed(0)}%`
