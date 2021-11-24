import { Box } from '@material-ui/core'
import { useRecoilValue } from 'recoil'

import { vehicleState, control2DFamily } from '../../model/state'
import { Controls2D } from '../../model/types'
import { mmPerS2kmPerHr, rad2Deg } from '../../util'

const Stats = () => {
  const vehicle = useRecoilValue(vehicleState)
  const control2d = [
    useRecoilValue(control2DFamily(Controls2D.MOTION_0)),
    useRecoilValue(control2DFamily(Controls2D.MOTION_1)),
  ]

  const stats = [
    ['speed', (vehicle.speedPredicted / mmPerS2kmPerHr).toFixed(1), null, 'Predicted speed (km/hr)'],
    ['rotation', formatAngle(vehicle.rotationPredicted), null, 'Predicted rotation'],
    ['pivot c', vehicle.pivot.x.toFixed(0), vehicle.pivot.y.toFixed(0), 'Current relative pivot point coordinates'],
    ['pivot p', formatAngle(vehicle.pivot.a), vehicle.pivot.r.toFixed(0), 'Current relative pivot point coordinates polar'],
    ['location', vehicle.centreAbs.x.toFixed(0), vehicle.centreAbs.y.toFixed(0), 'Predicted absolute vehicle center coordinates'],
    ...control2d.map((c, i) => [
      `control${i}`, formatAngle(c.a), formatMagnitude(c.r), `Control ${i} angle and magnitude`,
    ]),
    ...vehicle.wheels.map((w, i) => [
      `w${i}`, `${formatAngle(w.rotation, 0)} ${w.flipped ? 'F' : ''}`, (w.speed / mmPerS2kmPerHr).toFixed(1), `Wheel ${i}`,
    ]),
  ]

  return (
    <Box display="grid" gridTemplateColumns="1fr 1fr 1fr">
      {stats.map((row, ri) => row.slice(0, 3).map((v, ci) =>
        <Box width={75} key={`${ri}-${ci}`}>
          <span title={'' + row[3]}>{v}</span>
        </Box>
      ))}
    </Box>
  )
}

export default Stats

const formatAngle = (a:number, precision:number = 1) => `${rad2Deg(a).toFixed(precision)}°`
const formatMagnitude = (v:number) => `${(v * 100).toFixed(0)}%`
