import { atom, atomFamily } from "recoil";
import { wheelPositions } from "./constants";

export type Dimensions = {
  width: number,
  height: number
}

export const visualisationDimensionsState = atom<Dimensions>({
  key: 'visualisationDimensionsState',
  default: {width: 0, height: 0}
});


export type Vec2 = { x: number, y: number }
export type Polar = { r: number, a: number }
export type Coord = Vec2 & Polar

export const control2DFamily = atomFamily<Coord, string>({
  key: 'control2d',
  default: {x: 0, y: 0, r: 0, a: 0}
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
  centreAbs: Vec2
  rotationPredicted: number
  wheels: WheelState[]
  pivot: Coord
  pivotAbs:Vec2
  error:string|null
}

export const vehicleState = atom<VehicleState>({
  key: 'VehicleState',
  default: {
    centreAbs: {x: 7500, y: 5000},
    rotationPredicted: 0,
    wheels: wheelPositions.map(() => ({speed: 0, rotation: 0})),
    pivot: {x: 0, y: 0, r: 0, a: 0},
    // pivotDistance: Number.POSITIVE_INFINITY,
    pivotAbs: {x: 0, y: 0},
    error: null,
  }
});
