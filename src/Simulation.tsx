import produce from 'immer'
import { useEffect } from 'react'
import { CallbackInterface, useRecoilCallback, useRecoilValue } from 'recoil'

import { movementMagnitudeThreshold, maxSpeed, maxRPS, wheelPositions } from './constants'
import { frameRateState, DriveMode, driveModeState, Vec2, vehicleState, control2DFamily, Polar } from './state'
import { vecLen, constrainRange } from './util'

const pi = Math.PI

// function updateWheels (vehicleState:VehicleState, desiredPivot:Coord, desiredRotationDelta:number) {
//   const { pivot, wheels } = vehicleState
//   // Determine closest achievable pivot point to desired from current.
// }

const updateVehicleState = ({ snapshot, set }: CallbackInterface) => async () => {
  const frameRate = await snapshot.getPromise(frameRateState)

  const mode = await snapshot.getPromise(driveModeState)
  const control2d = [
    await snapshot.getPromise(control2DFamily('wasd')),
    await snapshot.getPromise(control2DFamily('mouse')),
  ]

  set(vehicleState, produce(vehicle => {
    if (control2d.some(c => c.r > movementMagnitudeThreshold)) {
      const { centreAbs: { x: xAbs, y: yAbs }, rotationPredicted } = vehicle
      const maxDeltaPerFrame = maxSpeed / frameRate
      const maxRotateAnglePerFrame = (maxRPS / frameRate) * pi * 2

      const direction = control2d[0].a

      // How far the vehicle will move this step.
      const delta = control2d[0].r
      const deltaStep = delta * maxDeltaPerFrame

      // How much the vehicle will turn this step.
      const turnRate = mode === DriveMode.TWIST_AND_SHOUT ? control2d[1].r : Math.abs(control2d[1].x)
      const turnRateStep = turnRate * maxRotateAnglePerFrame

      const isTranslating = delta > movementMagnitudeThreshold
      const isTurning = turnRate > movementMagnitudeThreshold

      // Polar coordinates for the pivot point (point to be rotated around).
      const pivotPolar:Polar = {
        a: 0, // determined by control method.
        r:
          (mode === DriveMode.BABY_YOU_CAN_DRIVE_MY_CAR ? 0.3 : delta)
          * (isTurning ? 2500 / turnRate : 10000000),
      }

      // The amount the vehicle will rotate around the pivot point.
      let rotationDelta = 0 // determined by control method.

      switch (mode) {
        // Control0 y determines forward/backward speed, control1 x determines turn rate and direction.
        case DriveMode.BABY_YOU_CAN_DRIVE_MY_CAR:
          pivotPolar.a = control2d[1].x >= 0 ? 0 : -pi
          rotationDelta
            = Math.atan2(deltaStep, pivotPolar.r)
            * (Math.sign(control2d[1].x) || 1)
            * -Math.sign(control2d[0].y)
          rotationDelta = constrainRange(rotationDelta, -maxRotateAnglePerFrame, maxRotateAnglePerFrame)
          break

        // control0 determines absolute direction, control1 spin rate.
        case DriveMode.DAY_TRIPPER:
          pivotPolar.a = direction + pi / 2 - rotationPredicted + (control2d[1].x >= 0 ? 0 : -pi)
          rotationDelta = !isTranslating
            ? turnRateStep * Math.sign(control2d[1].x)
            : Math.atan2(deltaStep, pivotPolar.r)
              * (Math.sign(control2d[1].x) || 1)
          break

        // control0 determines relative direction, control1 spin rate and pivot point.
        case DriveMode.TWIST_AND_SHOUT:
          pivotPolar.a = control2d[0].a + pi / 2 + control2d[1].a
          rotationDelta = !isTranslating
            ? turnRateStep * Math.sign(control2d[1].x)
            : Math.atan2(deltaStep, pivotPolar.r)
              * (Math.sign(control2d[1].x) || 1)
          break
      }

      // Cartesian coordinates for the pivot point.
      // Absolute to vehicle rotation, relative to vehicle position.
      const pivotAbs:Vec2 = {
        x: Math.cos(rotationPredicted + pivotPolar.a) * pivotPolar.r,
        y: Math.sin(rotationPredicted + pivotPolar.a) * pivotPolar.r,
      }
      // Relative to vehicle rotation and position.
      const pivot:(Polar&Vec2) = {
        ...pivotPolar,
        x: Math.cos(pivotPolar.a) * pivotPolar.r,
        y: Math.sin(pivotPolar.a) * pivotPolar.r,
      }

      // Ensure rotation rate does not exceed maximum (something wrong with code above if it does).
      if (Math.abs(rotationDelta) > maxRotateAnglePerFrame) {
        console.error('Maximum rotation rate exceeded')
        vehicle.error = 'Maximum rotation rate exceeded'
        return
      }

      // Simulated amount vehicle will move this step.
      const deltaVecSim:Vec2 = {
        x: pivotAbs.x - pivotAbs.x * Math.cos(rotationDelta) + pivotAbs.y * Math.sin(rotationDelta),
        y: pivotAbs.y - pivotAbs.x * Math.sin(rotationDelta) - pivotAbs.y * Math.cos(rotationDelta),
      }

      // Ensure speed does not exceed maximum (something wrong with code above if it does).
      if (vecLen(deltaVecSim.x, deltaVecSim.y) > maxDeltaPerFrame) {
        console.error('Maximum speed exceeded')
        vehicle.error = 'Maximum speed exceeded'
        return
      }

      for (let wi = 0; wi < wheelPositions.length; wi++) {
        let r = Math.atan2(pivot.y - wheelPositions[wi][1], pivot.x - wheelPositions[wi][0])
        if (rotationDelta < 0) r = (r + pi) % (pi * 2)
        vehicle.wheels[wi].rotation = r - pi / 2
      }

      // Update relative state variables.
      vehicle.pivot = pivot
      vehicle.rotationPredicted += rotationDelta

      // Update absolute state variables, only used for simulation.
      vehicle.centreAbs.x += deltaVecSim.x
      vehicle.centreAbs.y += deltaVecSim.y
      vehicle.pivotAbs.x = xAbs + pivotAbs.x
      vehicle.pivotAbs.y = yAbs + pivotAbs.y
    }
  }))
}

function Simulation () {
  const updateVehicleStateCallback = useRecoilCallback(updateVehicleState)

  const frameRate = useRecoilValue(frameRateState)

  useEffect(() => {
    const intervalHandle = setInterval(updateVehicleStateCallback, 1000 / frameRate)
    return () => clearInterval(intervalHandle)
  }, [updateVehicleStateCallback, frameRate])

  return null
}

export default Simulation
