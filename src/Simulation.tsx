import produce from 'immer';
import { useEffect } from 'react';
import { CallbackInterface, useRecoilCallback, useRecoilValue } from 'recoil';

import { movementMagnitudeThreshold, maxSpeed, maxRPS, wheelPositions } from './constants';
import { frameRateState, controlKeyPadState, controlMouseState, DriveMode, driveModeState, Point, vehicleState } from './state';


function Simulation() {
  const updateVehicleStateCallback = useRecoilCallback(updateVehicleState);

  const frameRate = useRecoilValue(frameRateState);

  useEffect(() => {
    const intervalHandle = setInterval(updateVehicleStateCallback, 1000 / frameRate);
    return () => clearInterval(intervalHandle);
  }, [updateVehicleStateCallback, frameRate]);
  
  return null
}

export default Simulation;


const pi = Math.PI;


const updateVehicleState = ({snapshot, set}: CallbackInterface) => async () => {
  const frameRate = await snapshot.getPromise(frameRateState);
  
  const mode = await snapshot.getPromise(driveModeState);
  const control2d = [
    await snapshot.getPromise(controlKeyPadState),
    await snapshot.getPromise(controlMouseState),
  ].map(c => ({
    ...c,
    radians: Math.atan2(c.y, c.x),
    magnitude: Math.min(1, vecLen(c.x, c.y)),
  }));

  set(vehicleState, produce(vehicle => {
    if (control2d.some(c => c.magnitude > movementMagnitudeThreshold)) {
      const {centreAbs: {x: xAbs, y: yAbs}, rotationPredicted} = vehicle;
      const maxDeltaPerFrame = maxSpeed / frameRate;
      const maxRotateAnglePerFrame = (maxRPS / frameRate) * pi * 2;

      const direction = control2d[0].radians;
      
      // How far the vehicle will move this step.
      const delta = control2d[0].magnitude;
      const deltaStep = delta * maxDeltaPerFrame;

      // How much the vehicle will turn this step.
      const turnRate = mode === DriveMode.TWIST_AND_SHOUT ? control2d[1].magnitude : Math.abs(control2d[1].x);
      const turnRateStep = turnRate * maxRotateAnglePerFrame;

      const isTranslating = delta > movementMagnitudeThreshold;
      const isTurning = turnRate > movementMagnitudeThreshold;
      
      // Polar coordinates for the pivot point (point to be rotated around).
      let pivotAngle = 0; // determined by control method.
      const pivotDistance = 
        (mode === DriveMode.BABY_YOU_CAN_DRIVE_MY_CAR ? 0.3 : delta) 
        * (isTurning ? 2500 / turnRate : 10000000);
      
      // The amount the vehicle will rotate around the pivot point.
      let rotationDelta = 0; // determined by control method.
      
      switch (mode) {
        // Control0 y determines forward/backward speed, control1 x determines turn rate and direction.
        case DriveMode.BABY_YOU_CAN_DRIVE_MY_CAR:
          pivotAngle = control2d[1].x >= 0 ? 0 : -pi;
          rotationDelta = 
            Math.atan2(deltaStep, pivotDistance)
            * delta
            * (Math.sign(control2d[1].x) || 1) 
            * -Math.sign(control2d[0].y);
          rotationDelta = constrainRange(rotationDelta, -maxRotateAnglePerFrame, maxRotateAnglePerFrame);
          break;
        
        // control0 determines absolute direction, control1 spin rate.
        case DriveMode.DAY_TRIPPER:
          pivotAngle = direction + pi/2 - rotationPredicted + (control2d[1].x >= 0 ? 0 : -pi);
          rotationDelta = !isTranslating 
            ? turnRateStep * Math.sign(control2d[1].x)
            : Math.atan2(deltaStep, pivotDistance) 
              * (Math.sign(control2d[1].x) || 1);
          break;

        // control0 determines relative direction, control1 spin rate and pivot point.
        case DriveMode.TWIST_AND_SHOUT:
          pivotAngle = control2d[0].radians + pi/2 + control2d[1].radians;
          rotationDelta = !isTranslating 
            ? turnRateStep * Math.sign(control2d[1].x)
            : Math.atan2(deltaStep, pivotDistance)
              * (Math.sign(control2d[1].x) || 1)
          break;
      }

      // Cartesian coordinates for the pivot point.
      // Absolute to vehicle rotation, relative to vehicle position.
      const pivotAbs:Point = {
        x: Math.cos(rotationPredicted + pivotAngle) * pivotDistance,
        y: Math.sin(rotationPredicted + pivotAngle) * pivotDistance,
      }
      // Relative to vehicle rotation and position.
      const pivot:Point = {
        x: Math.cos(pivotAngle) * pivotDistance,
        y: Math.sin(pivotAngle) * pivotDistance,
      }

      // Ensure rotation rate does not exceed maximum (something wrong with code above if it does).
      if (Math.abs(rotationDelta) > maxRotateAnglePerFrame) {
        console.error("Maximum rotation rate exceeded");
        vehicle.error = "Maximum rotation rate exceeded";
        return;
      }

      // Simulated amount vehicle will move this step.
      const deltaVecSim:Point = {
        x: pivotAbs.x - pivotAbs.x * Math.cos(rotationDelta) + pivotAbs.y * Math.sin(rotationDelta),
        y: pivotAbs.y - pivotAbs.x * Math.sin(rotationDelta) - pivotAbs.y * Math.cos(rotationDelta)
      }

      // Ensure speed does not exceed maximum (something wrong with code above if it does).
      if (vecLen(deltaVecSim.x, deltaVecSim.y) > maxDeltaPerFrame) {
        console.error("Maximum speed exceeded");
        vehicle.error = "Maximum speed exceeded";
        return;
      }
      
      // Update relative state variables.
      vehicle.pivotAngle = pivotAngle;
      vehicle.pivotDistance = pivotDistance;
      vehicle.rotationPredicted += rotationDelta;
      for (let wi = 0; wi < wheelPositions.length; wi++) {
        let r = Math.atan2(pivot.y-wheelPositions[wi][1], pivot.x-wheelPositions[wi][0]);
        if (rotationDelta < 0) r = (r + pi) % (pi * 2);
        vehicle.wheels[wi].rotation = r - pi/2;
      }

      // Update absolute state variables, only used for simulation.
      vehicle.centreAbs.x += deltaVecSim.x;
      vehicle.centreAbs.y += deltaVecSim.y;
      vehicle.pivotAbs.x = pivotAbs.x + xAbs;
      vehicle.pivotAbs.y = pivotAbs.y + yAbs;
    }
  }));
}


// const deg2Rad = (d:number) => d/180*pi;
// const rad2Deg = (r:number) => r/pi*180;
const vecLen = (x:number, y:number) => Math.sqrt(x*x + y*y);

const constrainRange = (x:number, min:number, max:number) => {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}