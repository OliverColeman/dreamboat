import produce from 'immer'
import { useEffect } from 'react'
import { CallbackInterface, useRecoilCallback } from 'recoil'
import Flatten from '@flatten-js/core'

import { movementMagnitudeThreshold, maxSpeed, maxRPS, wheelPositions, maxWheelSteerRPS, frameRate, DriveMode } from './constants'
import { driveModeState, vehicleState, control2DFamily } from './state'
import { constrainRange, getCoordFromPolar, getCoordFromPoint, indexOfMaximum, rad2Deg, normaliseAngle } from './util'
import { Coord, Point, Polar, VehicleState, WheelState } from './types'

const pi = Math.PI
const maxWheelSteerDeltaPerFrame = (maxWheelSteerRPS * pi * 2) / frameRate

function Simulation () {
  const updateVehicleStateCallback = useRecoilCallback(updateVehicleState)

  useEffect(() => {
    const intervalHandle = setInterval(updateVehicleStateCallback, 1000 / frameRate)
    return () => clearInterval(intervalHandle)
  }, [updateVehicleStateCallback, frameRate])

  return null
}

let prevControl2d:Coord[]

const updateVehicleState = ({ snapshot, set }: CallbackInterface) => async () => {
  const mode = await snapshot.getPromise(driveModeState)
  const control2d = [
    await snapshot.getPromise(control2DFamily('wasd')),
    await snapshot.getPromise(control2DFamily('mouse')),
  ]

  // if (_.isEqual(prevControl2d, control2d)) return
  // prevControl2d = control2d

  set(vehicleState, produce(vehicle => {
    if (control2d.some(c => c.r > movementMagnitudeThreshold)) {
      const { centreAbs: { x: xAbs, y: yAbs }, rotationPredicted } = vehicle
      const maxDeltaPerFrame = maxSpeed / frameRate
      const maxRotateAnglePerFrame = (maxRPS / frameRate) * pi * 2

      // For DAY_TRIPPER and TWIST_AND_SHOUT mode,
      // base pivot angle is orthogonal to desired driving direction.
      const pivotAngle = control2d[0].a + pi / 2

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
          (mode === DriveMode.DRIVE_MY_CAR ? 0.3 : delta)
          * (isTurning ? 2500 / turnRate : 1000000),
      }

      // The amount the vehicle will rotate around the pivot point.
      let rotationDelta = 0 // determined by control method.

      switch (mode) {
        // Control0 y determines forward/backward speed, control1 x determines turn rate and direction.
        case DriveMode.DRIVE_MY_CAR:
          pivotPolar.a = control2d[1].x >= 0 ? 0 : -pi
          rotationDelta
            = Math.atan2(deltaStep, pivotPolar.r)
            * (Math.sign(control2d[1].x) || 1)
            * -Math.sign(control2d[0].y)
          rotationDelta = constrainRange(rotationDelta, -maxRotateAnglePerFrame, maxRotateAnglePerFrame)
          break

        // control0 determines absolute direction, control1 spin rate.
        case DriveMode.DAY_TRIPPER:
          pivotPolar.a = pivotAngle - rotationPredicted + (control2d[1].x >= 0 ? 0 : -pi)
          rotationDelta = !isTranslating
            ? turnRateStep * Math.sign(control2d[1].x)
            : Math.atan2(deltaStep, pivotPolar.r)
              * (Math.sign(control2d[1].x) || 1)
          break

        // control0 determines relative direction, control1 spin rate and pivot point.
        case DriveMode.TWIST_AND_SHOUT:
          pivotPolar.a = pivotAngle + control2d[1].a
          rotationDelta = !isTranslating
            ? turnRateStep * Math.sign(control2d[1].x)
            : Math.atan2(deltaStep, pivotPolar.r)
              * (Math.sign(control2d[1].x) || 1)
          break
      }

      // Desired pivot point relative to vehicle rotation and position.
      const pivotTarget = getCoordFromPolar(pivotPolar)

      const {
        pivotAchievable, // Actual pivot point we're aiming to achieve this time step.
        achievableWheelState, // Actual wheel angles we're aiming to achieve this time step.
        targetWheelState, // The current target wheel state (if no restrictions on wheel turn rate).
      } = updateWheels(vehicle, pivotTarget, rotationDelta)

      // Cartesian coordinates for the pivot point.
      // Absolute to vehicle rotation, relative to vehicle position.
      const pivotAbs:Point = {
        x: Math.cos(rotationPredicted + pivotAchievable.a) * pivotAchievable.r,
        y: Math.sin(rotationPredicted + pivotAchievable.a) * pivotAchievable.r,
      }

      // Ensure rotation rate does not exceed maximum (something wrong with code above if it does).
      if (Math.abs(rotationDelta) > maxRotateAnglePerFrame) {
        console.error('Maximum rotation rate exceeded')
        vehicle.error = 'Maximum rotation rate exceeded'
        return
      }

      // Simulated amount vehicle will move this step.
      const deltaVecSim:Point = {
        x: pivotAbs.x - pivotAbs.x * Math.cos(rotationDelta) + pivotAbs.y * Math.sin(rotationDelta),
        y: pivotAbs.y - pivotAbs.x * Math.sin(rotationDelta) - pivotAbs.y * Math.cos(rotationDelta),
      }
      // Ensure speed does not exceed maximum (something wrong with code above if it does).
      // if (vecLen(deltaVecSim.x, deltaVecSim.y) > maxDeltaPerFrame) {
      //   console.error('Maximum speed exceeded')
      //   vehicle.error = 'Maximum speed exceeded'
      //   return
      // }

      // Update relative state variables.
      vehicle.pivot = pivotAchievable
      vehicle.pivotTarget = pivotTarget
      vehicle.wheels = achievableWheelState
      vehicle.wheelsTarget = targetWheelState
      vehicle.rotationPredicted = (vehicle.rotationPredicted + rotationDelta + pi * 2) % (pi * 2)

      // Update absolute state variables, only used for simulation.
      vehicle.centreAbs.x += deltaVecSim.x
      vehicle.centreAbs.y += deltaVecSim.y
      vehicle.pivotAbs.x = xAbs + pivotAbs.x
      vehicle.pivotAbs.y = yAbs + pivotAbs.y
    }
  }))
}

function updateWheels (vehicleState:VehicleState, targetPivot:Coord, targetRotationDelta:number) {
  // console.log('==============')
  // console.log('maxAllowedAngleDelta', rad2Deg(maxWheelSteerDeltaPerFrame))

  const { wheels, pivot: currentPivot } = vehicleState

  // Determine closest achievable pivot point to desired from current.

  let pivotAchievable = targetPivot
  let targetWheelAngles: number[]|null = null
  for (let attempt = 0; ; attempt++) {
    // console.log('attempt', attempt)
    // console.log('pivotAchievable:', rad2Deg(pivotAchievable.a), pivotAchievable.r)

    const achievableWheelAngles = calculateWheelAnglesForPivot(wheels, pivotAchievable, targetRotationDelta)
    if (targetWheelAngles === null) {
      targetWheelAngles = achievableWheelAngles
    }

    const wheelAngleDeltas = achievableWheelAngles.map((ta, i) => normaliseAngle(ta - wheels[i].rotation))

    // Determine which wheel would have to turn the most to achieve the target pivot point.
    const indexOfWheelTurningTheMost = indexOfMaximum(wheelAngleDeltas.map(Math.abs))

    // console.log('    achievableWheelAngles', achievableWheelAngles.map(d => rad2Deg(d).toFixed(1)))
    // console.log('    pivotAchievable:', pivotAchievable.x.toFixed(1), pivotAchievable.y.toFixed(1))
    // console.log('    wheelAngleDeltas', wheelAngleDeltas.map(d => rad2Deg(d).toFixed(1)))
    // console.log('    indexOfWheelTurningTheMost', indexOfWheelTurningTheMost)

    // If wheels have to turn more than they can during this time step to achieve the current pivot point,
    // return the calculated new target wheel states for the new target pivot point.
    if (Math.abs(wheelAngleDeltas[indexOfWheelTurningTheMost]) <= maxWheelSteerDeltaPerFrame * 1.01) {
      // console.log('    found valid solution')
      return {
        pivotAchievable,
        achievableWheelState: achievableWheelAngles.map(a => ({ rotation: a, speed: 0 })),
        targetWheelState: targetWheelAngles.map(a => ({ rotation: a, speed: 0 })),
      }
    }

    if (attempt === 10) {
      throw Error('Could not determine valid wheel positions, too many attempts.')
    }

    // Calculate achievable pivot point by calculating where the line perpendicular to the wheel
    // that will turn the most intersects the line between the current and target pivot points.
    const pivotCurrent2TargetLine = new Flatten.Line(
      new Flatten.Point(currentPivot.x, currentPivot.y),
      new Flatten.Point(targetPivot.x, targetPivot.y)
    )

    // console.log('    currentPivot', currentPivot.x.toFixed(1), currentPivot.y.toFixed(1))
    // console.log('    targetPivot', targetPivot.x.toFixed(1), targetPivot.y.toFixed(1))

    const newNormalForWheelTurningTheMost
      = normaliseAngle(
        wheels[indexOfWheelTurningTheMost].rotation
        + maxWheelSteerDeltaPerFrame * Math.sign(wheelAngleDeltas[indexOfWheelTurningTheMost])
        + Math.PI / 2
      )

    // console.log('    newNormalForWheelTurningTheMost', rad2Deg(newNormalForWheelTurningTheMost).toFixed())

    const achievableWheelAngleLine = new Flatten.Line(
      new Flatten.Point(wheelPositions[indexOfWheelTurningTheMost].x, wheelPositions[indexOfWheelTurningTheMost].y),
      new Flatten.Vector(Math.cos(newNormalForWheelTurningTheMost), Math.sin(newNormalForWheelTurningTheMost))
    )

    // console.log('    wheelPosition', wheelPositions[indexOfWheelTurningTheMost].x.toFixed(1), wheelPositions[indexOfWheelTurningTheMost].y.toFixed(1))
    // console.log('    normVector', Math.cos(newNormalForWheelTurningTheMost).toFixed(1), Math.sin(newNormalForWheelTurningTheMost).toFixed(1))

    // console.log('    achievableWheelAngleLine', achievableWheelAngleLine)

    const intersections = achievableWheelAngleLine.intersect(pivotCurrent2TargetLine)
    if (intersections.length !== 1) {
      throw Error(`Could not determine valid wheel positions. ${intersections.length}`)
    }

    // console.log('    intersection', intersections[0])

    pivotAchievable = getCoordFromPoint({ x: intersections[0].x, y: intersections[0].y })
  }

  // throw Error('Could not determine valid wheel positions, too many attempts.')

  // const targetAngleDeltaAchievableProportion = Math.min(
  //   1,
  //   maxAllowedAngleDelta / Math.abs(targetWheelAnglesDelta[indexOfMaxTargetAngleDelta])
  // )

  // return {
  //   pivot: targetPivot,
  //   targetWheelState: targetWheelAngles.map(a => ({ rotation: a, speed: 0 })),
  // }

  // // TODO this is wrong, need to calculate angle differently, from centre of vehicle not centre of a wheel.
  // const pivot = getCoordFromPolar({
  //   a: targetWheelAngles[indexOfMaxTargetAngleDelta] * targetAngleDeltaAchievableProportion,
  //   r: targetPivot.r * targetAngleDeltaAchievableProportion, // TODO Is lerping the pivir distance right?
  // })

  // console.log('targetPivot', targetPivot)
  // console.log('pivot', pivot)

  // // TODO Calculate wheel speeds.

  // const newWheelAngles = calculateWheelAnglesForPivot(wheels, pivotAchievable, targetRotationDelta)
  // const targetWheelState = newWheelAngles.map(a => ({ rotation: a, speed: 0 }))

  // return {
  //   pivotAchievable,
  //   targetWheelState,
  // }
}

const calculateWheelAnglesForPivot = (wheels: WheelState[], pivot:Coord, rotationDelta:number) =>
  wheels.map((w, wi) => {
    const wp = wheelPositions[wi]
    const a = Math.atan2(pivot.y - wp.y, pivot.x - wp.x)
    // If we're going backwards, turn the wheels 180
    // TODO should just be reversing wheel speed, but also should be based on which way the wheel is facing given current target direction.
    // if (rotationDelta < 0) a = (a + pi + pi * 2) % (pi * 2)
    // if (wi === 0) console.log(a)
    // a += pi / 2
    return a
  })

export default Simulation
