import { atom, atomFamily } from 'recoil'
import { wheelPositions } from '../settings'
import { DriveMode, Dimensions, Coord, VehicleState } from './types'
import { getCoordFromPolar } from '../util'
import _ from 'lodash'

export const appDimensionsState = atom<Dimensions>({
  key: 'appDimensionsState',
  default: { width: 0, height: 0 },
})

export const control2DFamily = atomFamily<Coord, string>({
  key: 'control2d',
  default: { x: 0, y: 0, r: 0, a: 0 },
})

export const control1DState = atom<number>({
  key: 'Control1DState',
  default: 0,
})

export const driveModeState = atom<DriveMode>({
  key: 'DriveModeState',
  default: DriveMode.DRIVE_MY_CAR,
})

export const vehicleState = atom<VehicleState>({
  key: 'VehicleState',
  default: {
    centreAbs: { x: 0, y: 0 },
    rotationPredicted: 0,
    wheelsNext: wheelPositions.map(() => ({ speed: 0, angle: 0, flipped: false })),
    wheelsTarget: wheelPositions.map(() => ({ speed: 0, angle: 0, flipped: false })),
    pivot: getCoordFromPolar({ r: 10000, a: 0 }),
    pivotTarget: getCoordFromPolar({ r: 10000, a: 0 }),
    pivotAbs: { x: 0, y: 0 },
    speedPredicted: 0,
    rpmPredicted: 0,
    error: null,
    telemetry: null,
    brakeEnabled: false,
  },
})
