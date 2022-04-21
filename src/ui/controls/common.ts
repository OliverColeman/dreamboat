import { Controls2D } from '../../model/types'
import { movementMagnitudeThreshold } from '../../settings'
import { constrainRange, getCoordFromPoint, getCoordFromPolar } from '../../util'

export type Control2DProps = {
  id: Controls2D
}

export const update2DControlCoords = (x: number, y: number) => {
  x = constrainRange(x, -1, 1)
  y = constrainRange(y, -1, 1)
  let { a, r } = getCoordFromPoint({ x, y })
  // Non-linear for soft-start
  r = constrainRange(r ** 2, 0, 1)
  if (r < movementMagnitudeThreshold) a = 0
  return getCoordFromPolar({ a, r })
}
