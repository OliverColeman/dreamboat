import produce from 'immer'
import _ from 'lodash'

import { movementMagnitudeThreshold, maxVehicleSpeed, maxRPS, wheelPositions, maxWheelSteerRPS, frameRate, wheelPivotDistanceDiscountDistance, wheelAngleToleranceForFullSpeed, maxCurvatureDeltaPerSecond } from '../settings'
import { constrainRange, deg2Rad, getCoordFromPolar, normaliseAngle, vecLen } from '../util'
import { Coord, Point, Polar, VehicleState, WheelState, DriveMode, Vec2, Telemetry, WheelTelemetry } from './types'

const pi = Math.PI
const maxDeltaPerFrame = maxVehicleSpeed / frameRate
const maxRotateAnglePerFrame = (maxRPS / frameRate) * pi * 2
/** Maximum amount a wheel can turn per frame. */
export const maxWheelSteerDeltaPerFrame = (maxWheelSteerRPS * pi * 2) / frameRate
/** Maximum amount the steering curvature can change per frame. */
const maxCurvatureDeltaPerFrame = maxCurvatureDeltaPerSecond / frameRate

/** The distance (from centre) of the pivot point when going "straight", in mm. */
const PIVOT_RADIUS_HEADING_STRAIGHT = 100000000
/** The minimum distance (from centre) of the pivot point when turning, in mm (at maximum speed for modes
 * other than drive my car, for example, for drive my car this is multiplied by DRIVE_MY_CAR_TURN_RATE_FACTOR).
 */
const PIVOT_RADIUS_TURNING_MIN = 1000
/** The closest to the vehicle centre the pivot point search represents a pivot point, in mm.
 * A pivot point at the centre itself is a steering curvature of infinity, which the search cannot
 * interpolate towards, so it needs a finite stand-in; one millimetre from the centre is far inside
 * the wheelbase and gives wheel angles within a twentieth of a degree of those for the centre.
 */
const PIVOT_RADIUS_SEARCH_MIN = 1
/** How many times the pivot point search may halve the fraction it is trying before giving up and
 * leaving the pivot point where it is. The fraction the wheels can reach is not always a large one:
 * a pivot point being brought in from far ahead to the vehicle centre, which is how the other two
 * drive modes start spinning on the spot, covers nearly all of that ground in the first thousandth
 * of the way, so the search has to be able to reach fractions that small. Twenty halvings reach one
 * part in a million.
 */
const PIVOT_SEARCH_DESCENT_STEPS = 20
/** How many times the pivot point search halves the bracket the descent above ends up with. The
 * descent leaves the largest reachable fraction known to within a factor of two; eight more halvings
 * bring that to within a quarter of a percent of it, which at the most the wheels can turn in one
 * frame is a twentieth of a degree of steering given up.
 */
const PIVOT_SEARCH_REFINE_STEPS = 8
/** How close to straight ahead every commanded wheel angle has to be for the steering to count as
 * centred. */
const WHEEL_STRAIGHT_TOLERANCE = deg2Rad(0.5)
/** How far a commanded wheel angle has to move in one frame for the steering to count as still
 * moving. */
const STEERING_PROGRESS_TOLERANCE = deg2Rad(0.05)
/** For how many consecutive frames the steering has to fail to move before it is taken to be as
 * straight as it is going to get. A wheel that cannot turn holds the whole steering geometry off
 * straight, and no amount of further asking will move it, so the wait for straight ahead gives up
 * after this many frames. Telemetry arrives less often than frames do, which by itself holds the
 * commanded angles still for two or three frames at a time, so this is set well above that.
 */
const STEERING_STALL_FRAMES = frameRate

/**
 * Whether every wheel is commanded to point straight ahead. A wheel points along a line rather than
 * in a direction, so a wheel commanded to 180 degrees is as straight as one commanded to 0; the
 * angle is doubled before it is normalised, which folds the two ends of the wheel together.
 */
const steeringIsStraight = (wheels: WheelState[]) =>
  wheels.every(w => Math.abs(normaliseAngle(w.angle * 2)) / 2 <= WHEEL_STRAIGHT_TOLERANCE)

/**
 * Calculates new positions/angles and speeds for each wheel based on the control inputs and selected driving mode.
 *
 * Vehicle motion is always modelled as the vehile pivoting around a "pivot point";
 * in order to move in a straight line the pivot point is moved out a long way from the vehicle (ideally infinitely).
 * A target pivot point is determined from drive mode and the control inputs.
 * An "achievable" pivot point for this iteration is then calculated from the current wheel positions and
 * the target pivot point.
 * The vehicle state is updated according to these calculations, including predicted new
 * location, angle, speed, and rotation.
 */
export const updateVehicleState = (mode: DriveMode, control2d: Coord[], telemetry:Telemetry) =>
  produce((vehicle: VehicleState) => {
    /** Whether either control is being asked for anything. */
    const controlsAreActive = control2d.some(c => c.r > movementMagnitudeThreshold)
    if (vehicle.brakeEnabled) {
      const wheelBrakePositions = vehicle.wheelsNext.map((w, wi) => ({
        angle: (wi === 0 || wi === 3 ? -1 : 1) * pi / 4,
        flipped: false,
        speed: 0,
      }))
      vehicle.wheelsNext = wheelBrakePositions
      vehicle.wheelsTarget = wheelBrakePositions
      vehicle.pivotTarget = { x: 0, y: 0, r: 0, a: 0 }
      vehicle.pivot = { x: 0, y: 0, r: 0, a: 0 }
      vehicle.pivotCurvature = 0
      vehicle.speedPredicted = 0
      vehicle.rpmPredicted = 0
      vehicle.steeringStalledFrames = 0
    } else if (
      controlsAreActive
      // With the controls centred drive my car steers back to straight ahead, which takes several
      // iterations, so keep updating until it has got there. The steering curvature is slew limited
      // and the wheels are limited by how fast they can turn, and the wheels are the slower of the
      // two, so the curvature reaching zero says only that the vehicle has been asked to go
      // straight, not that it is pointing that way: the wheels have to be commanded straight too.
      // A wheel that cannot turn would hold that off for ever, so the wait also gives up once the
      // steering has stopped moving.
      || (mode === DriveMode.DRIVE_MY_CAR
        && (vehicle.pivotCurvature !== 0
          || (!steeringIsStraight(vehicle.wheelsNext) && (vehicle.steeringStalledFrames || 0) < STEERING_STALL_FRAMES)))
    ) {
      const { centreAbs: { x: xAbs, y: yAbs }, rotationPredicted: currentRotationPredicted } = vehicle

      // For DAY_TRIPPER and HELTER_SKELTER mode,
      // base pivot angle is orthogonal to desired driving direction.
      const pivotAngle = control2d[0].a + pi / 2

      // How fast the vehicle should move as a proportion of the maximum speed, range is [-1, 1].
      const travelInput = mode === DriveMode.DRIVE_MY_CAR ? control2d[0].y : control2d[0].r
      const travelRate = Math.abs(travelInput) > movementMagnitudeThreshold ? travelInput : 0
      // How far the vehicle will move this step, in mm.
      const travelDelta = travelRate * maxDeltaPerFrame

      // How fast the vehicle should turn, as a proportion of the maximum turn rate, range is [0, 1]
      const turnRate = mode === DriveMode.HELTER_SKELTER ? control2d[1].r : Math.abs(control2d[1].x)
      // How much the vehicle will turn this step, in radians.
      const turnDelta = turnRate * maxRotateAnglePerFrame

      const isTravelling = travelRate > movementMagnitudeThreshold
      const isTurning = turnRate > movementMagnitudeThreshold

      const DRIVE_MY_CAR_TURN_RATE_FACTOR = 0.5

      // Polar coordinates for the pivot point (point to be rotated around).
      const pivotTargetPolar:Polar = {
        a: 0, // determined by control method.
        r:
          (mode === DriveMode.DRIVE_MY_CAR ? DRIVE_MY_CAR_TURN_RATE_FACTOR : travelRate)
          * (isTurning ? PIVOT_RADIUS_TURNING_MIN / turnRate : PIVOT_RADIUS_HEADING_STRAIGHT),
      }

      // The direction the vehicle is being asked to travel in, as an angle relative to the vehicle.
      // DRIVE_MY_CAR travels along the vehicle's own axis; the other two modes take the direction
      // from the first control, which DAY_TRIPPER reads as an absolute bearing and HELTER_SKELTER as
      // one relative to the vehicle.
      const travelDirection = mode === DriveMode.DAY_TRIPPER
        ? control2d[0].a - currentRotationPredicted
        : mode === DriveMode.HELTER_SKELTER
          ? control2d[0].a
          : pi / 2

      /**
       * How far the vehicle turns about a given pivot point in this time step, in radians, when it
       * is being asked to travel rather than to spin on the spot.
       *
       * The vehicle centre travels `travelDelta` along its arc whichever pivot point is used, so the
       * angle subtended at the pivot point depends on how far away that pivot point is: rotating
       * about a nearer or farther pivot point by the angle worked out for some other pivot point
       * would move the vehicle at some other speed than the speed asked for.
       *
       * Which way the vehicle turns follows from which side of the direction of travel the pivot
       * point lies on: the vehicle centre moves at right angles to the line joining it to the pivot
       * point, so a pivot point to one side gives forward travel for one direction of rotation and a
       * pivot point to the other side for the other. Reading the side off the pivot point being used
       * rather than the one asked for keeps travel in the direction asked for while the pivot point
       * is passing from one side of the vehicle to the other.
       */
      const travelRotationForPivot = (pivot:Coord) =>
        Math.atan2(travelDelta, pivot.r) * (Math.sign(Math.sin(pivot.a - travelDirection)) || 1)

      // The amount the vehicle will rotate about a given pivot point, in radians.
      let rotationForPivot: (pivot:Coord) => number = () => 0

      if (mode === DriveMode.DRIVE_MY_CAR) {
        // Control0 y determines forward/backward speed, control1 x determines turn rate and direction.

        // Steering is expressed as a signed curvature: the reciprocal of the distance to the pivot point,
        // positive for a pivot point to the right of the vehicle and negative for one to the left.
        // Curvature is continuous through zero, which is straight ahead (an infinitely distant pivot point),
        // so the pivot point moves from one side of the vehicle to the other by way of straight ahead
        // rather than by way of the vehicle centre, and nothing about the motion is discontinuous.
        const steeringInput = Math.abs(control2d[1].x) > movementMagnitudeThreshold ? control2d[1].x : 0
        const curvatureTarget = steeringInput / (DRIVE_MY_CAR_TURN_RATE_FACTOR * PIVOT_RADIUS_TURNING_MIN)
        const curvature = constrainRange(
          curvatureTarget,
          vehicle.pivotCurvature - maxCurvatureDeltaPerFrame,
          vehicle.pivotCurvature + maxCurvatureDeltaPerFrame
        )
        vehicle.pivotCurvature = curvature

        const pivotIsToTheRight = curvature >= 0
        pivotTargetPolar.a = pivotIsToTheRight ? 0 : pi
        pivotTargetPolar.r = Math.min(1 / Math.abs(curvature), PIVOT_RADIUS_HEADING_STRAIGHT)

        rotationForPivot = travelRotationForPivot
      } else if (mode === DriveMode.DAY_TRIPPER) {
        // control0 determines absolute direction, control1 spin rate.
        pivotTargetPolar.a = pivotAngle - currentRotationPredicted + (control2d[1].x >= 0 ? 0 : -pi)
        rotationForPivot = !isTravelling
          ? () => turnDelta * Math.sign(control2d[1].x)
          : travelRotationForPivot
      } else if (mode === DriveMode.HELTER_SKELTER) {
        // control0 determines relative direction, control1 spin rate and pivot point.
        // Need a threshold on the magnitude so the pivot angle doesn't fluctuate wildly when the stick isn't being moved.
        const relativePivotAngle = (control2d[1].r > 0.1 ? control2d[1].a : 0)
        const relativePivotX = (control2d[1].r > 0.1 ? control2d[1].x : 0)

        pivotTargetPolar.a = pivotAngle + relativePivotAngle
        rotationForPivot = !isTravelling
          ? () => turnDelta * Math.sign(relativePivotX)
          : travelRotationForPivot
      }

      const boundedRotationForPivot = (pivot:Coord) =>
        constrainRange(rotationForPivot(pivot), -maxRotateAnglePerFrame, maxRotateAnglePerFrame)

      pivotTargetPolar.a = normaliseAngle(pivotTargetPolar.a)

      // Desired pivot point relative to vehicle rotation and position.
      const pivotTarget = getCoordFromPolar(pivotTargetPolar)

      const {
        pivotAchievable, // Actual pivot point we're aiming to achieve this time step.
        rotationAchievable, // Achievable amount of rotation around pivotAchievable this time step, rad/sec
        achievableWheelState, // Actual wheel angles we're aiming to achieve this time step.
        targetWheelState, // The current target wheel state (if no restrictions on wheel turn rate).
      } = updateWheels(vehicle, pivotTarget, boundedRotationForPivot, telemetry.downlow.wheels)

      // Cartesian coordinates for the pivot point.
      // Absolute to vehicle rotation, relative to vehicle position.
      const pivotAbs:Point = {
        x: Math.cos(currentRotationPredicted + pivotAchievable.a) * pivotAchievable.r,
        y: Math.sin(currentRotationPredicted + pivotAchievable.a) * pivotAchievable.r,
      }

      // Simulated amount vehicle will move this step.
      const deltaVecSim:Point = {
        x: pivotAbs.x - pivotAbs.x * Math.cos(rotationAchievable) + pivotAbs.y * Math.sin(rotationAchievable),
        y: pivotAbs.y - pivotAbs.x * Math.sin(rotationAchievable) - pivotAbs.y * Math.cos(rotationAchievable),
      }

      // Whether the steering is still moving. A wheel that cannot turn pins the pivot point where it
      // is, and the wheel angles with it, and there is then nothing further to wait for. Only the
      // wait for straight ahead gives up on a wheel like that, so the count runs only while the
      // controls are centred; the steering also sits still while a steady lock is being held, and
      // that says nothing about whether a wheel can turn.
      const steeringIsMoving = achievableWheelState.some((ws, wi) =>
        Math.abs(normaliseAngle(ws.angle - vehicle.wheelsNext[wi].angle)) > STEERING_PROGRESS_TOLERANCE)
      vehicle.steeringStalledFrames
        = controlsAreActive || steeringIsMoving || telemetry.downlow.emergencyStopTriggered
          ? 0
          : (vehicle.steeringStalledFrames || 0) + 1

      // Update relative state variables.
      vehicle.pivot = pivotAchievable
      vehicle.pivotTarget = pivotTarget
      vehicle.wheelsNext = achievableWheelState
      vehicle.wheelsTarget = targetWheelState
      vehicle.rotationPredicted = normaliseAngle((vehicle.rotationPredicted + rotationAchievable + pi * 2) % (pi * 2))
      vehicle.speedPredicted = getSpeedFromAngularDisplacement(pivotAchievable, { x: 0, y: 0 }, rotationAchievable)
      vehicle.rpmPredicted = (rotationAchievable * frameRate * 60) / (pi * 2) // Convert to revolutions per minute

      // Update absolute state variables, only used for simulation/visualisation.
      vehicle.centreAbs.x += deltaVecSim.x
      vehicle.centreAbs.y += deltaVecSim.y
      vehicle.pivotAbs.x = xAbs + pivotAbs.x
      vehicle.pivotAbs.y = yAbs + pivotAbs.y
    } else {
      vehicle.wheelsNext = vehicle.wheelsNext.map(w => ({ ...w, speed: 0 }))
      vehicle.wheelsTarget = vehicle.wheelsNext.map(w => ({ ...w, speed: 0 }))
      vehicle.pivotTarget = vehicle.pivot
      vehicle.speedPredicted = 0
      vehicle.rpmPredicted = 0
    }
    vehicle.telemetry = telemetry
  })

/** Return value for the function that determines new wheel states given a target pivot point and speed. */
type NewWheelStateInfo = {
  /** The pivot point that is achievable in the next time step, given wheel turn speed limitations. */
  pivotAchievable: Coord
  /** The amount of rotation that is achievable in the next time (limited by maximum wheel speed). */
  rotationAchievable: number
  /** The wheel state that is achievable in the next time step, given wheel turn speed limitations. */
  achievableWheelState: WheelState[]
  /** The target wheel state, without considering wheel turn speed limitations. */
  targetWheelState : WheelState[]
}

/**
 * A pivot point written as a steering curvature: the pivot point divided by the square of its
 * distance from the vehicle centre, so that it points the same way as the pivot point and is as long
 * as the reciprocal of the distance to it. The map is its own inverse. It takes a pivot point
 * infinitely far away to zero and one at the vehicle centre to infinity, so a straight line drawn in
 * it goes from one side of the vehicle to the other by way of straight ahead and never crosses the
 * vehicle, which is the way the steering itself goes.
 *
 * Distances outside the range the pivot point is ever placed at are brought into it, so that
 * straight ahead and the vehicle centre both have a finite curvature to interpolate between.
 */
const curvatureFromPivot = (pivot:Coord):Vec2 => {
  const distance = constrainRange(pivot.r, PIVOT_RADIUS_SEARCH_MIN, PIVOT_RADIUS_HEADING_STRAIGHT)
  return { x: Math.cos(pivot.a) / distance, y: Math.sin(pivot.a) / distance }
}

/**
 * The pivot point for a steering curvature, the inverse of `curvatureFromPivot`.
 * A curvature of zero is straight ahead, where the pivot point is infinitely far away and which side
 * of the vehicle it is on is no longer written in the curvature; `angleWhenStraight` says which side
 * to take it as being on there.
 */
const pivotFromCurvature = (curvature:Vec2, angleWhenStraight:number):Coord => {
  const magnitude = vecLen(curvature.x, curvature.y)
  return getCoordFromPolar(
    magnitude <= 1 / PIVOT_RADIUS_HEADING_STRAIGHT
      ? { r: PIVOT_RADIUS_HEADING_STRAIGHT, a: magnitude > 0 ? Math.atan2(curvature.y, curvature.x) : angleWhenStraight }
      : { r: 1 / magnitude, a: Math.atan2(curvature.y, curvature.x) }
  )
}

/**
 * Determine new wheel angles and speeds for the given target pivot point.
 *
 * The wheels can only turn so far in one time step, so the target pivot point is not always one they
 * can be aimed at straight away. Where it is not, the pivot point actually used is somewhere between
 * the one the wheels are currently held at and the one being asked for, and the job here is to find
 * the furthest along that way the wheels can reach. "Between" is measured as steering curvature
 * rather than as position, so that a pivot point moving from one side of the vehicle to the other
 * goes out towards infinity and comes back on the other side, which is the path the steering takes,
 * instead of straight across the wheelbase, which no steering geometry passes through.
 *
 * How far the wheels have to turn does not have to fall away smoothly along that path, so the
 * halving search is not guaranteed to find the very furthest reachable point; it finds one that is
 * reachable, and where it stops short it stops short on the safe side, asking the wheels for less
 * than they could have done and picking up the rest on the following frame.
 *
 * @param vehicleState Current vehicle state.
 * @param targetPivot The target pivot point, relative to current vehicle rotation and position.
 * @param rotationForPivot The amount the vehicle is to rotate about a given pivot point, in radians. Used to determine wheel speeds.
 */
function updateWheels (vehicleState:VehicleState, targetPivot:Coord, rotationForPivot:(pivot:Coord) => number, wheelTelemetry:WheelTelemetry[]): NewWheelStateInfo {
  const { wheelsNext: wheels, pivot: currentPivot } = vehicleState

  const curvatureCurrent = curvatureFromPivot(currentPivot)
  // A pivot point at the vehicle centre has no direction to it: spinning about a point a hair to one
  // side of the centre is the same manoeuvre as spinning about a point a hair to the other, and the
  // two drive modes that spin on the spot ask for the centre exactly. Give it the direction the
  // pivot point already has, so that the search brings the pivot point straight in rather than
  // carrying it round the vehicle to arrive from a direction that means nothing.
  const curvatureTarget = curvatureFromPivot(
    targetPivot.r < PIVOT_RADIUS_SEARCH_MIN ? { ...targetPivot, a: currentPivot.a } : targetPivot)

  /** The wheel state for the pivot point a given fraction of the way from the current pivot point to
   * the target one, measured as steering curvature. */
  const stateAtFraction = (fraction:number) => {
    const pivot = fraction >= 1
      ? targetPivot
      : pivotFromCurvature({
        x: curvatureCurrent.x + (curvatureTarget.x - curvatureCurrent.x) * fraction,
        y: curvatureCurrent.y + (curvatureTarget.y - curvatureCurrent.y) * fraction,
      }, targetPivot.a)
    const rotation = rotationForPivot(pivot)
    return { pivot, rotation, wheelState: calculateWheelStateForPivot(wheels, pivot, rotation, wheelTelemetry) }
  }

  /** Whether no wheel has to turn further than it can in one time step to take up these angles. */
  const isReachable = (wheelState:WheelState[]) => wheelState.every((ws, wi) =>
    Math.abs(normaliseAngle(ws.angle - wheelTelemetry[wi].angle)) <= maxWheelSteerDeltaPerFrame * 1.01)

  const target = stateAtFraction(1)
  const targetWheelState = target.wheelState
  let achievable = target

  if (!isReachable(targetWheelState)) {
    // The pivot point the wheels are currently held at is where the search starts from and is taken
    // as reachable; where the wheels have since been carried past it, holding them where they are is
    // still the best that can be done.
    achievable = stateAtFraction(0)
    let reachableFraction = 0
    let unreachableFraction = 1
    // Halve the fraction until one of them is reachable. Halving rather than stepping down evenly
    // because the fraction that is reachable is not of a known size: a small movement of the pivot
    // point can be most of the way to it or a millionth of the way, depending on how far away it is.
    for (let step = 0; step < PIVOT_SEARCH_DESCENT_STEPS; step++) {
      const fraction = unreachableFraction / 2
      const candidate = stateAtFraction(fraction)
      if (isReachable(candidate.wheelState)) {
        reachableFraction = fraction
        achievable = candidate
        break
      }
      unreachableFraction = fraction
    }
    // Then close the gap between the reachable fraction and the unreachable one above it.
    if (reachableFraction > 0) {
      for (let step = 0; step < PIVOT_SEARCH_REFINE_STEPS; step++) {
        const fraction = (reachableFraction + unreachableFraction) / 2
        const candidate = stateAtFraction(fraction)
        if (isReachable(candidate.wheelState)) {
          reachableFraction = fraction
          achievable = candidate
        } else {
          unreachableFraction = fraction
        }
      }
    }
  }

  const { pivot: pivotAchievable, wheelState: achievableWheelState } = achievable
  let rotationAchievable = achievable.rotation
  let speedReductionFactor = 1

  // If any achievable wheel angles are too far from the target wheel angle, slow or stop driving.
  const achieveableVsTargetAngleDeltas = achievableWheelState.map(
    (ws, wi) => Math.abs(normaliseAngle((ws.angle - targetWheelState[wi].angle) * 2)) / 2
  )
  // Also factor in how close the pivot point is to the wheel, if it's close it doesn't matter so much.
  const wheelDistanceToPivot = wheelPositions.map(wheelPos => (vecLen(wheelPos.x - pivotAchievable.x, wheelPos.y - pivotAchievable.y)))
  const achieveableVsTargetAngleDeltasDiscounted = achieveableVsTargetAngleDeltas.map((angleDelta, wi) =>
    wheelDistanceToPivot[wi] > wheelPivotDistanceDiscountDistance
      ? angleDelta // If greater than wheelPivotDistanceDiscountDistance mm then no discounting.
      : (wheelDistanceToPivot[wi] / wheelPivotDistanceDiscountDistance) * angleDelta // If less than wheelPivotDistanceDiscountDistance mm then discount proportionally.
  )
  const maxAngleDiff = _.max(achieveableVsTargetAngleDeltasDiscounted)
  if (maxAngleDiff > 0) {
    speedReductionFactor
      = maxAngleDiff >= wheelAngleToleranceForFullSpeed
        ? 0
        : 1 - maxAngleDiff / wheelAngleToleranceForFullSpeed
  }

  // If any wheels are set to go faster than possible (can happen for outside wheels when turning),
  // scale speed back to achievable amount.
  const maxWheelSpeed = _.max(achievableWheelState.map(ws => Math.abs(ws.speed)))
  if (maxWheelSpeed > maxVehicleSpeed) {
    speedReductionFactor = Math.min(speedReductionFactor, maxVehicleSpeed / maxWheelSpeed)
  }

  if (speedReductionFactor < 1) {
    for (const ws of achievableWheelState) {
      ws.speed *= speedReductionFactor
    }
    rotationAchievable *= speedReductionFactor
  }

  return {
    pivotAchievable,
    rotationAchievable,
    achievableWheelState,
    targetWheelState,
  }
}

/**
 * Calculate the new angle and speed for each wheel given a desired pivot point and rotation delta.
 * @param wheels Current wheel state.
 * @param pivot The desired pivot point, relative to current vehicle rotation and position..
 * @param rotationDelta The amount the vehicle centre is to rotate around the pivot point.
 * @return New wheel states.
 */
const calculateWheelStateForPivot = (wheels: WheelState[], pivot:Coord, rotationDelta:number, wheelTelemetry:WheelTelemetry[]): WheelState[] =>
  wheels.map((w, wi) => {
    const wp = wheelPositions[wi]
    const telemetry = wheelTelemetry[wi]
    let a = Math.atan2(pivot.y - wp.y, pivot.x - wp.x)
    if (w.flipped) {
      a = normaliseAngle(a + Math.PI)
    }

    let reversed = false

    // If the wheel needs to turn more than 90 degrees,
    // then turn the other way and reverse the direction.
    if (Math.abs(normaliseAngle(a - telemetry.angle)) >= Math.PI - maxWheelSteerDeltaPerFrame) {
      a = normaliseAngle(a + Math.PI)
      reversed = true
    }

    const flipped = reversed ? !w.flipped : w.flipped

    return {
      angle: a,
      flipped,
      speed: getSpeedFromAngularDisplacement(pivot, wp, rotationDelta) * (flipped ? -1 : 1),
    }
  })

/**
 * Calculate speed that a point moves when rotated around a pivot point at a given angle.
 * Assumes the time base is the `frameRate` from settings.ts
 * @param pivot The pivot point.
 * @param point The point being rotated.
 * @param rotationDelta The amount the point is rotated around the pivot point.
 * @return The speed, in mm/s.
 */
const getSpeedFromAngularDisplacement = (pivot:Coord, point:Vec2, rotationDelta:number) => {
  const distanceToPivot = vecLen(point.x - pivot.x, point.y - pivot.y)
  const distanceToTravel = 2 * distanceToPivot * Math.sin(rotationDelta / 2)
  const speed = distanceToTravel * frameRate
  return speed
}
