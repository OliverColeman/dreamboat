import { atom } from "recoil";
import { wheelPositions } from "./constants";

export type Dimensions = {
  width: number,
  height: number
}

export const visualisationDimensionsState = atom<Dimensions>({
  key: 'visualisationDimensionsState',
  default: {width: 0, height: 0}
});


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
  BABY_YOU_CAN_DRIVE_MY_CAR,
  DAY_TRIPPER,
  TWIST_AND_SHOUT,
}

export const driveModeState = atom<number>({
  key: 'DriveModeState',
  default: DriveMode.BABY_YOU_CAN_DRIVE_MY_CAR
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
  centreAbs: Point
  rotationPredicted: number
  wheels: WheelState[]
  pivotAngle: number
  pivotDistance: number
  pivotAbs:Point
  error:string|null
}

export const vehicleState = atom<VehicleState>({
  key: 'VehicleState',
  default: {
    centreAbs: {x: 7500, y: 5000},
    rotationPredicted: 0,
    wheels: wheelPositions.map(() => ({speed: 0, rotation: 0})),
    pivotAngle: Math.PI,
    pivotDistance: Number.POSITIVE_INFINITY,
    pivotAbs: {x: 0, y: 0},
    error: null,
  }
});
