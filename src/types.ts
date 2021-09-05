export type Dimensions = {
  width: number,
  height: number
}
export type Vec2 = { x: number, y: number }
export type Point = Vec2
export type Polar = {
  /** Distance */
  r: number,
  /** Angle in radians */
  a: number
}
export type Coord = Point & Polar

/** Current state of a wheel */
export type WheelState = {
  /** Desired speed */
  speed: number
  /** Desired rotation relative to vehicle */
  rotation: number
}

/** Current state of vehicle */
export type VehicleState = {
  /** Predicted position of vehicle in absolute coordinates */
  centreAbs: Point
  /** Predicted absolute rotation of vehicle */
  rotationPredicted: number
  /** State for each wheel */
  wheels: WheelState[]
  /** Target state for each wheel */
  wheelsTarget: WheelState[]
  /** Current actual relative pivot point */
  pivot: Coord
  /** Current target relative pivot point */
  pivotTarget: Coord
  /** Current predicted pivot point in absolute coordinates */
  pivotAbs:Point
  /** Current predicted speed */
  speedPredicted: number
  /** Current error state, if any */
  error:string|null
}
