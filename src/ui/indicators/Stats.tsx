import { Box, makeStyles } from '@material-ui/core'
import { useRecoilValue } from 'recoil'

import { vehicleState, control2DFamily, appDimensionsState } from '../../model/state'
import { AppDimensionStyleProps, Controls2D } from '../../model/types'
import { mmPerS2kmPerHr, rad2Deg } from '../../util'

const useStyles = makeStyles((theme) =>
  ({
    stats: ({ appDimensions }:AppDimensionStyleProps) => ({
      position: 'absolute',
      bottom: 0,
      right: 0,
      zIndex: 10,
      fontSize: '16px',
      width: 300,
      overflowX: 'hidden',
    }),
  })
)

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

  const appDimensions = useRecoilValue(appDimensionsState)
  const classes = useStyles({ appDimensions })

  return (
    <div className={classes.stats}>
      <Box display="grid" gridTemplateColumns="1fr 1fr 1fr">
        {stats.map((row, ri) => row.slice(0, 3).map((v, ci) =>
          <Box width={75} key={`${ri}-${ci}`}>
            <span title={'' + row[3]}>{v}</span>
          </Box>
        ))}
      </Box>
    </div>
  )
}

export default Stats

const formatAngle = (a:number, precision:number = 1) => `${rad2Deg(a).toFixed(precision)}°`
const formatMagnitude = (v:number) => `${(v * 100).toFixed(0)}%`
