import { Polar, Point } from './model/types'

export const deg2Rad = (d:number) => d / 180 * Math.PI

export const rad2Deg = (r:number) => r / Math.PI * 180

export const vecLen = (x:number, y:number) => Math.sqrt(x * x + y * y)

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

export const normaliseAngle = (a: number) => {
  while (a < -Math.PI) a += Math.PI * 2
  while (a > Math.PI) a -= Math.PI * 2
  return a
}
