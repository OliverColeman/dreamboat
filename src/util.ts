import { Polar, Point } from './model/types'

export const deg2Rad = (d:number) => d / 180 * Math.PI

export const rad2Deg = (r:number) => r / Math.PI * 180

export const vecLen = (x:number, y:number) => Math.sqrt(x * x + y * y)

export const pointDistance = (p1: Point, p2:Point) => vecLen(p1.x - p2.x, p1.y - p2.y)

export const lerpPoints = (p1: Point, p2:Point, u:number) => ({
  x: p1.x + (p2.x - p1.x) * u,
  y: p1.y + (p2.y - p1.y) * u,
} as Point)

export const constrainRange = (x:number, min:number, max:number) => {
  if (x < min) return min
  if (x > max) return max
  return x
}

export const getPointFromPolar = ({ a, r }:Polar):Point => ({
  x: Math.cos(a) * r,
  y: Math.sin(a) * r,
})

export const getPolarFromPoint = ({ x, y }:Point):Polar => ({
  a: Math.atan2(y, x),
  r: vecLen(x, y),
})

export const getCoordFromPolar = (p:Polar) => ({
  ...p,
  ...getPointFromPolar(p),
})

export const getCoordFromPoint = (p:Point) => ({
  ...p,
  ...getPolarFromPoint(p),
})

export const indexOfMaximum = (values: number[]) => {
  if (values.length === 0) return -1
  let maxIndex = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[maxIndex]) {
      maxIndex = i
    }
  }
  return maxIndex
}

/** Returns the given value normalised to be within the specified range, by subtracting or adding `max-min` from/to `val`. */
export const normaliseValueToRange = (min:number, val:number, max:number) => {
  const range = max - min
  while (val > max) val -= range
  while (val < min) val += range
  return val
}

/** Normalise the given angle, in radians, to the range [-PI, PI] */
export const normaliseAngle = (a: number) => normaliseValueToRange(-Math.PI, a, Math.PI)

/** Factor to convert mm/s to km/hr. */
export const mmPerS2kmPerHr = (1000 * 1000) / (60 * 60)
