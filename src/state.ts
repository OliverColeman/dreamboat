import { atom, CallbackInterface } from "recoil";
import produce from "immer";
import { maxRPS, maxSpeed, movementMagnitudeThreshold, wheelPositions } from "./constants";


const pi = Math.PI;


export type Point = { x: number, y: number }


export const controlMouseState = atom<Point>({
  key: 'controlMouseState',
  default: {x: 0, y: 0}
});

export const controlKeyPadState = atom<Point>({
  key: 'controlKeyPadState',
  default: {x: 0, y: 0}
});

export const control1DState = atom<number>({
  key: 'Control1DState',
  default: 0
});

export enum DriveMode {
  TWIST_AND_SHOUT,
  DAY_TRIPPER,
  BABY_YOU_CAN_DRIVE_MY_CAR,
}

export const driveModeState = atom<number>({
  key: 'DriveModeState',
  default: DriveMode.TWIST_AND_SHOUT
});


export const frameRateState = atom<number>({
  key: 'FrameRateState',
  default: 10
});


export type WheelState = {
  speed: number
  rotation: number
}

export type VehicleState = {
  centre: Point
  rotation: number
  wheels: WheelState[]
  pivotAngle: number
  pivotDistance: number
  pivot:Point
}

export const vehicleState = atom<VehicleState>({
  key: 'VehicleState',
  default: {
    centre: {x: 7500, y: 7500},
    rotation: 0,
    wheels: wheelPositions.map(() => ({speed: 0, rotation: 0})),
    pivotAngle: pi/2,
    pivotDistance: Number.POSITIVE_INFINITY,
    pivot: {x: 0, y: 0},
  }
});


export const updateVehicleState = ({snapshot, set}: CallbackInterface) => async () => {
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
      const {centre: {x, y}, rotation} = vehicle;
      const maxRotateAnglePerFrame = (maxRPS / frameRate) * pi * 2;

      // Polar coordinates for the pivot point (point to be rotated around).
      let pivotAngle = 0, pivotDistance=0;

      let direction = control2d[0].radians;
      
      // How far the vehicle will move this step.
      const delta = control2d[0].magnitude * maxSpeed / frameRate;

      // How far the vehicle will move this step.
      const turnRate = Math.abs(control2d[1].x); // control2d[1].magnitude;
      let turnAngleOffset = control2d[1].radians;
      
      const translating = delta > movementMagnitudeThreshold;
      const turning = turnRate > movementMagnitudeThreshold;
      
      // Polar coordinates for the pivot point (point to be rotated around).
      pivotDistance = delta * (turning ? 20 / turnRate : 10000000); //Number.MAX_VALUE;

      let rotationDelta = 0, pivot:Point = {x: 0, y:0}
      
      // control1 determines relative direction, control2 spin rate and pivot point.
      if (mode === DriveMode.TWIST_AND_SHOUT) {
        pivotAngle = direction + pi/2 + (turning ? turnAngleOffset : 0);

        // The angle the vehicle will rotate around the pivot point.
        rotationDelta = !translating ? maxRotateAnglePerFrame * turnRate : Math.sign(pivotDistance) * Math.atan2(delta, Math.abs(pivotDistance));
        if (turning && (turnAngleOffset < -pi/2 || turnAngleOffset > pi/2)) rotationDelta = -rotationDelta;
      }

      // control1 determines absolute direction, control2 spin rate.
      else if (mode === DriveMode.DAY_TRIPPER) {
        pivotAngle = direction + pi/2 - rotation;
      
        // The angle the vehicle will rotate around the pivot point.
        rotationDelta = !translating ? maxRotateAnglePerFrame * turnRate : Math.atan2(delta, pivotDistance);
      }
      else if (mode === DriveMode.BABY_YOU_CAN_DRIVE_MY_CAR) {
        turnAngleOffset = control2d[1].x > 0 ? 0 : -pi * Math.sign(control2d[0].y);

        pivotAngle = (control2d[0].y < 0 ? 0 : pi) + (turning ? turnAngleOffset : 0);
        
        // The angle the vehicle will rotate around the pivot point.
        rotationDelta = !translating ? maxRotateAnglePerFrame * turnRate : Math.sign(pivotDistance) * Math.atan2(delta, Math.abs(pivotDistance));
        if (turning && (turnAngleOffset < -pi/2 || turnAngleOffset > pi/2)) rotationDelta = -rotationDelta;
        
      }
      
      // Cartesian coordinates for the pivot point.
      pivot.x = Math.cos(rotation + pivotAngle) * pivotDistance;
      pivot.y = Math.sin(rotation + pivotAngle) * pivotDistance;

      if (rotationDelta < -maxRotateAnglePerFrame) rotationDelta = -maxRotateAnglePerFrame;
      if (rotationDelta > maxRotateAnglePerFrame) rotationDelta = maxRotateAnglePerFrame;

      let deltaX = pivot.x - pivot.x * Math.cos(rotationDelta) + pivot.y * Math.sin(rotationDelta);
      let deltaY = pivot.y - pivot.x * Math.sin(rotationDelta) - pivot.y * Math.cos(rotationDelta);
      
      vehicle.centre.x += deltaX;
      vehicle.centre.y += deltaY;
      vehicle.pivotAngle = pivotAngle;
      vehicle.pivotDistance = pivotDistance;
      vehicle.pivot.x = pivot.x + x;
      vehicle.pivot.y = pivot.y + y;
      vehicle.rotation += rotationDelta;

      const pivotXRel = Math.cos(pivotAngle) * pivotDistance;
      const pivotYRel = Math.sin(pivotAngle) * pivotDistance;
      for (let wi = 0; wi < wheelPositions.length; wi++) {
        let r = Math.atan2(pivotYRel-wheelPositions[wi][1], pivotXRel-wheelPositions[wi][0]);
        if (rotationDelta < 0) r = (r + pi) % (pi * 2);
        vehicle.wheels[wi].rotation = r - pi/2;
      }
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