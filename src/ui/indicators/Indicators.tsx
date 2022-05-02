import { Theme, makeStyles, useTheme } from '@material-ui/core'
import { useRecoilValue } from 'recoil'
import _ from 'lodash'

import { vehicleState } from '../../model/state'
import { fontSize } from '../../settings'
import { mmPerS2kmPerHr, rad2Deg } from '../../util'

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
    speedrpmroot: () => ({
      fontSize,
    }),
    speedrpm: () => ({
      display: 'inline-block',
      width: 120,
      marginRight: 16,
    }),
    error: () => ({
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
  const telemetry = vehicle.telemetry

  const theme = useTheme()
  const classes = useStyles(theme)

  return <div className={classes.root}>
    <div className={classes.speedrpmroot}>
      <div className={classes.speedrpm}>
        {(Math.abs(vehicle.speedPredicted) / mmPerS2kmPerHr).toFixed(1)} km/h
      </div>
      <div className={classes.speedrpm}>
        {(rad2Deg(Math.abs(vehicle.rpmPredicted)) / 60).toFixed(1)} RPM
      </div>
    </div>

    {!telemetry
      ? <strong>Initialising</strong>
      : <>
        { telemetry.motorControllers.map((mc, mci) => (
          (!mc.connected || mc.error)
            ? <div key={`mc${mci}`} className={classes.error}>
                {`Drive motor controller ${mci}: ${!mc.connected ? 'disconnected; ' : ''} ${mc.error}`}
              </div>
            : null
        )) }

        { (!telemetry.downlow.isConnected || telemetry.downlow.error)
            && <div className={classes.error}>
                {`Steering controller: ${!telemetry.downlow.isConnected ? 'disconnected; ' : ''} ${telemetry.downlow.error}`}
              </div>
        }

        <strong>Wheels</strong>
        { telemetry.wheels.map((wheel, wi) =>
          <div className={classes.fieldRow} key={`w${wi}`}>
            <div className={classes.field}>
              {(wheel.driveRate * 100).toFixed(0)}%
            </div>
            <div className={classes.field}>
              {wheel.driveCurrent.toFixed(1)}A
            </div>
            <div className={classes.field}>
              {wheel.driveOutputTemperature}&deg;C
            </div>

            <div className={classes.field}>
              {(wheel.steeringRate * 100).toFixed(0)}%
            </div>
            <div className={classes.field}>
              {wheel.steeringCurrent.toFixed(1)}A
            </div>

            { !wheel.ready && <div>homing...</div> }
          </div>
        ) }

        <div>Battery: {telemetry.motorControllers?.[0]?.batteryVoltage}V</div>

        <div>CPU temp: {Math.round(telemetry.controller.cpuTemperature)}&deg;C</div>
      </>
    }
  </div>
}

export default Indicators
