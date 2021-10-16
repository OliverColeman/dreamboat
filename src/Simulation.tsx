import produce from 'immer'
import { useEffect } from 'react'
import { CallbackInterface, useRecoilCallback } from 'recoil'
import Flatten from '@flatten-js/core'

import { movementMagnitudeThreshold, maxSpeed, maxRPS, wheelPositions, maxWheelSteerRPS, frameRate, DriveMode, control0, control1 } from './constants'
import { driveModeState, vehicleState, control2DFamily } from './state'
import { constrainRange, getCoordFromPolar, getCoordFromPoint, indexOfMaximum, rad2Deg, normaliseAngle, deg2Rad } from './util'
import { Coord, Point, Polar, VehicleState, WheelState } from './types'

const pi = Math.PI
const maxWheelSteerDeltaPerFrame = (maxWheelSteerRPS * pi * 2) / frameRate
const maxDeltaPerFrame = maxSpeed / frameRate
const maxRotateAnglePerFrame = (maxRPS / frameRate) * pi * 2

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
  try {
    const mode = await snapshot.getPromise(driveModeState)
    const control2d = [
      await snapshot.getPromise(control2DFamily(control0)),
      await snapshot.getPromise(control2DFamily(control1)),
    ]

    // if (_.isEqual(prevControl2d, control2d)) return
    // prevControl2d = control2d

    set(vehicleState, produce(vehicle => {
      if (control2d.some(c => c.r > movementMagnitudeThreshold)) {
        const { centreAbs: { x: xAbs, y: yAbs }, rotationPredicted, pivot: currentPivot } = vehicle

        // For DAY_TRIPPER and TWIST_AND_SHOUT mode,
        // base pivot angle is orthogonal to desired driving direction.
        const pivotAngle = control2d[0].a + pi / 2

        // How far the vehicle will move this step.
        const delta = mode === DriveMode.DRIVE_MY_CAR ? control2d[0].y : control2d[0].r
        const deltaStep = delta * maxDeltaPerFrame

        // How much the vehicle will turn this step.
        const turnRate = mode === DriveMode.TWIST_AND_SHOUT ? control2d[1].r : Math.abs(control2d[1].x)
        const turnRateStep = turnRate * maxRotateAnglePerFrame

        const isTranslating = delta > movementMagnitudeThreshold
        const isTurning = turnRate > movementMagnitudeThreshold

        const DRIVE_MY_CAR_TURN_RATE_FACTOR = 0.3
        // This is the distance of the pivot point when going "straight", in metres.
        const PIVOT_RADIUS_MAX = 100000000

        // Polar coordinates for the pivot point (point to be rotated around).
        const pivotTargetPolar:Polar = {
          a: 0, // determined by control method.
          r:
            (mode === DriveMode.DRIVE_MY_CAR ? DRIVE_MY_CAR_TURN_RATE_FACTOR : delta)
            * (isTurning ? 2500 / turnRate : PIVOT_RADIUS_MAX),
        }

        // The amount the vehicle will rotate around the pivot point.
        let rotationDelta = 0 // determined by control method.

        switch (mode) {
          // Control0 y determines forward/backward speed, control1 x determines turn rate and direction.
          case DriveMode.DRIVE_MY_CAR:
            pivotTargetPolar.a = control2d[1].x >= 0 ? 0 : pi

            // console.log('current ', Math.round(rad2Deg(currentPivot.a)), Math.round(currentPivot.r))
            // console.log('t ', Math.round(rad2Deg(pivotTargetPolar.a)), Math.round(pivotTargetPolar.r))

            if (currentPivot.a !== pivotTargetPolar.a) {
              if (currentPivot.r < DRIVE_MY_CAR_TURN_RATE_FACTOR * PIVOT_RADIUS_MAX) {
                pivotTargetPolar.a = currentPivot.a
                pivotTargetPolar.r = DRIVE_MY_CAR_TURN_RATE_FACTOR * PIVOT_RADIUS_MAX
              } else {
                pivotTargetPolar.r = DRIVE_MY_CAR_TURN_RATE_FACTOR * PIVOT_RADIUS_MAX
              }

              // console.log('t2', Math.round(rad2Deg(pivotTargetPolar.a)), Math.round(pivotTargetPolar.r))
            }

            rotationDelta
              = Math.atan2(deltaStep, pivotTargetPolar.r)
              * -(Math.sign(control2d[1].x) || 1)
              // * -Math.sign(control2d[0].y)
            rotationDelta = constrainRange(rotationDelta, -maxRotateAnglePerFrame, maxRotateAnglePerFrame)
            break

          // control0 determines absolute direction, control1 spin rate.
          case DriveMode.DAY_TRIPPER:
            pivotTargetPolar.a = pivotAngle - rotationPredicted + (control2d[1].x >= 0 ? 0 : -pi)
            rotationDelta = !isTranslating
              ? turnRateStep * Math.sign(control2d[1].x)
              : Math.atan2(deltaStep, pivotTargetPolar.r)
                * (Math.sign(control2d[1].x) || 1)
            break

          // control0 determines relative direction, control1 spin rate and pivot point.
          case DriveMode.TWIST_AND_SHOUT:
            pivotTargetPolar.a = pivotAngle + control2d[1].a
            rotationDelta = !isTranslating
              ? turnRateStep * Math.sign(control2d[1].x)
              : Math.atan2(deltaStep, pivotTargetPolar.r)
                * (Math.sign(control2d[1].x) || 1)
            break
        }

        // Desired pivot point relative to vehicle rotation and position.
        const pivotTarget = getCoordFromPolar(pivotTargetPolar)

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
  } catch (e) {
    console.log(e)
  }
}

function updateWheels (vehicleState:VehicleState, targetPivot:Coord, targetRotationDelta:number) {
  // console.log('==============')
  console.log('maxAllowedAngleDelta', rad2Deg(maxWheelSteerDeltaPerFrame))

  const { wheels, pivot: currentPivot } = vehicleState

  // Determine closest achievable pivot point to desired from current.

  let pivotAchievable = targetPivot
  let targetWheelState: WheelState[]|null = null
  for (let attempt = 0; ; attempt++) {
    // console.log('attempt', attempt)
    // console.log('pivotAchievable:', rad2Deg(pivotAchievable.a), pivotAchievable.r)

    const achievableWheelState = calculateWheelStateForPivot(wheels, pivotAchievable, targetRotationDelta)
    const achievableWheelAngles = achievableWheelState.map(ws => ws.rotation)

    // First time through the loop we get the target wheel state from calculateWheelStateForPivot(),
    // record it for returning later.
    if (targetWheelState === null) {
      targetWheelState = achievableWheelState
    }

    const wheelAngleDeltas = achievableWheelAngles.map((ta, i) => normaliseAngle(ta - wheels[i].rotation))

    // Determine which wheel would have to turn the most to achieve the target pivot point.
    const indexOfWheelTurningTheMost = indexOfMaximum(wheelAngleDeltas.map(Math.abs))

    // console.log('    achievableWheelAngles', achievableWheelAngles.map(d => rad2Deg(d).toFixed(1)))
    // console.log('    pivotAchievable:', pivotAchievable.x.toFixed(1), pivotAchievable.y.toFixed(1))
    // console.log('    wheelAngleDeltas', wheelAngleDeltas.map(d => rad2Deg(d).toFixed(1)))
    // console.log('    indexOfWheelTurningTheMost', indexOfWheelTurningTheMost)

    // If found a pivot point (either the given target or an intermediate between current and target)
    // where wheels do not have to turn more than they can during this time step,
    // return the calculated new target wheel states for the new (possibly intermediate) target pivot point.
    if (Math.abs(wheelAngleDeltas[indexOfWheelTurningTheMost]) <= maxWheelSteerDeltaPerFrame * 1.01) {
      // console.log('    found valid solution')

      return {
        pivotAchievable,
        achievableWheelState,
        targetWheelState,
      }
    }

    if (attempt > wheels.length) {
      throw Error('Could not determine valid wheel positions, too many attempts.')
    }

    // Calculate an intermediate pivot point by calculating where the line perpendicular to the wheel
    // that will turn the most intersects the line between the current and target pivot points.

    // Get the line between current and target pivot points.
    const pivotCurrent2TargetLine = new Flatten.Line(
      new Flatten.Point(currentPivot.x, currentPivot.y),
      new Flatten.Point(targetPivot.x, targetPivot.y)
    )

    // console.log('    currentPivot', currentPivot.x.toFixed(1), currentPivot.y.toFixed(1))
    // console.log('    targetPivot', targetPivot.x.toFixed(1), targetPivot.y.toFixed(1))

    Math.abs(wheelAngleDeltas[indexOfWheelTurningTheMost]) >= Math.PI - maxWheelSteerDeltaPerFrame && console.log('go other way')

    // For the wheel that had to turn the most, get the line perpendicular to it for the angle
    // that it can achieve this time step.
    const achieveableAngleForWheelTurningTheMost
      = normaliseAngle(
        wheels[indexOfWheelTurningTheMost].rotation + Math.PI / 2 // Normal to current orientation
        + maxWheelSteerDeltaPerFrame // Plus the amount it can turn this time step
        * Math.sign(wheelAngleDeltas[indexOfWheelTurningTheMost]) // In the direction it needs to turn
        // Flipped 180 if that would be closer to the target
        * (Math.abs(wheelAngleDeltas[indexOfWheelTurningTheMost]) >= Math.PI - maxWheelSteerDeltaPerFrame ? -1 : 1)
      )
    const achievablePerpendicularLineForWheelTurningTheMost = new Flatten.Line(
      new Flatten.Point(wheelPositions[indexOfWheelTurningTheMost].x, wheelPositions[indexOfWheelTurningTheMost].y),
      new Flatten.Vector(Math.cos(achieveableAngleForWheelTurningTheMost), Math.sin(achieveableAngleForWheelTurningTheMost))
    )

    // console.log('    newNormalForWheelTurningTheMost', rad2Deg(newNormalForWheelTurningTheMost).toFixed())
    // console.log('    wheelPosition', wheelPositions[indexOfWheelTurningTheMost].x.toFixed(1), wheelPositions[indexOfWheelTurningTheMost].y.toFixed(1))
    // console.log('    normVector', Math.cos(newNormalForWheelTurningTheMost).toFixed(1), Math.sin(newNormalForWheelTurningTheMost).toFixed(1))

    // console.log('    achievableWheelAngleLine', achievableWheelAngleLine)

    // Get intersection of the above lines.
    const intersections = achievablePerpendicularLineForWheelTurningTheMost.intersect(pivotCurrent2TargetLine)
    if (intersections.length !== 1) {
      throw Error(`Could not determine valid wheel positions. ${intersections.length}`)
    }

    // console.log('    intersection', intersections[0])

    pivotAchievable = getCoordFromPoint({ x: intersections[0].x, y: intersections[0].y })
  }
}

const calculateWheelStateForPivot = (wheels: WheelState[], pivot:Coord, rotationDelta:number): WheelState[] =>
  wheels.map((w, wi) => {
    const wp = wheelPositions[wi]
    let a = Math.atan2(pivot.y - wp.y, pivot.x - wp.x)
    if (w.flipped) {
      a = normaliseAngle(a + Math.PI)
    }

    let reversed = false

    // If the wheel needs to turn more than 90 degrees,
    // then turn the other way and reverse the direction.
    if (Math.abs(normaliseAngle(a - w.rotation)) >= Math.PI - maxWheelSteerDeltaPerFrame) {
    // if (Math.abs(normaliseAngle(a - w.rotation)) > Math.PI / 2) {
      // console.log('    rev', wi, rad2Deg(a), rad2Deg(normaliseAngle(a + Math.PI)))
      a = normaliseAngle(a + Math.PI)
      reversed = true
    } else {
      // console.log('    fwd', wi, rad2Deg(a))
    }

    // If we're going backwards, turn the wheels 180
    // TODO should just be reversing wheel speed, but also should be based on which way the wheel is facing given current target direction.
    // if (rotationDelta < 0) a = (a + pi + pi * 2) % (pi * 2)
    // if (wi === 0) console.log(a)
    // a += pi / 2
    return {
      rotation: a,
      flipped: reversed ? !w.flipped : w.flipped,
      speed: w.speed,
    }
  })

export default Simulation
