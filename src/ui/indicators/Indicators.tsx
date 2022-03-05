import { Theme, makeStyles, useTheme } from '@material-ui/core'
import { useRecoilValue } from 'recoil'
import _ from 'lodash'

import { telemetryState, vehicleState } from '../../model/state'
import { fontSize } from '../../settings'
import { mmPerS2kmPerHr } from '../../util'

const useStyles = makeStyles<Theme>((theme) =>
  ({
    root: () => ({
      position: 'absolute',
      bottom: 0,
      right: 0,
      zIndex: 10,
      fontSize: '16px',
      width: 300,
      overflowX: 'hidden',
    }),
    speed: () => ({
      fontSize,
    }),
    connected: () => ({
      // color: theme.palette.primary.main,
    }),
    disconnected: () => ({
      color: theme.palette.error.main,
    }),
    fieldRow: () => ({
      display: 'flex',
    }),
    field: () => ({
      width: 80,
    }),
  })
)

const Indicators = () => {
  const vehicle = useRecoilValue(vehicleState)
  const telemetry = useRecoilValue(telemetryState)

  const theme = useTheme()
  const classes = useStyles(theme)

  return <div className={classes.root}>
    <div className={classes.speed}>
      {(vehicle.speedPredicted / mmPerS2kmPerHr).toFixed(1)} km/h
    </div>

    <strong>Motors</strong>
    {telemetry.motorControllers.map((mc, mci) =>
      <div
        key={`mc${mci}`}
        className={mc.connected && !mc.error ? classes.connected : classes.disconnected}
      >
        {mc.error
          ? <div>{mc.error}</div>
          : mc.motors.map((motor, mi) =>
              <div className={classes.fieldRow} key={`mc${mci}-m${mi}`}>
                <div className={classes.field}>
                  {Math.round(motor.rate * 100)}%
                </div>
                <div className={classes.field}>
                  {motor.current.toFixed(1)}A
                </div>
                <div className={classes.field}>
                  {motor.temperature}&deg;C
                </div>
              </div>
          )
        }
      </div>
    )}

    <div>Battery: {telemetry.motorControllers?.[0]?.batteryVoltage}v</div>

    <div>CPU temp: {Math.round(telemetry.controller.cpuTemperature)}&deg;C</div>
  </div>
}

export default Indicators
