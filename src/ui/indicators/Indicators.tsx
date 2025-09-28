import { Theme, makeStyles, useTheme } from '@material-ui/core'
import { useRecoilValue } from 'recoil'
import _ from 'lodash'

import { vehicleState } from '../../model/state'
import { fontSize } from '../../settings'
import { mmPerS2kmPerHr, rad2Deg } from '../../util'

const useStyles = makeStyles<Theme>((theme) => ({
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
  fieldNumeric: () => ({
    minWidth: '50px',
    maxWidth: '50px',
    textAlign: 'right',
  }),
  fieldText: () => ({
    minWidth: '70px',
    maxWidth: '70px',
    textAlign: 'left',
    paddingLeft: '20px',
  }),
}))

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
        {vehicle.rpmPredicted.toFixed(1)} RPM
      </div>
    </div>

    {!telemetry
      ? <strong>Initialising</strong>
      : <>
        { (!telemetry.downlow.isConnected || telemetry.downlow.error)
            && <div className={classes.error}>
                {`Downlow controller: ${!telemetry.downlow.isConnected ? 'disconnected; ' : ''} ${telemetry.downlow.error}`}
              </div>
        }

        <table style={ { marginLeft: '-5px' } }><tbody>
        <tr>
          <th style={ { textAlign: 'center' } } colSpan={2}>Drive</th>
          <th style={ { textAlign: 'center' } } colSpan={2}>Steer</th>
          <th className={classes.fieldText}>Status</th>
        </tr>
        { telemetry.downlow.wheels.map((wheel, wi) =>
          <tr key={`w${wi}`}>
            <td className={classes.fieldNumeric}>
              {(wheel.driveRate * 100).toFixed(0)}%
            </td>
            <td className={classes.fieldNumeric}>
              {wheel.driveCurrent.toFixed(1)}A
            </td>

            <td className={classes.fieldNumeric}>
              {(wheel.steeringRate * 100).toFixed(0)}%
            </td>
            <td className={classes.fieldNumeric}>
              {wheel.steeringCurrent.toFixed(1)}A
            </td>

            <td className={classes.fieldText}>
              {wheel.steeringMotorControllerFault ? 'fault' : (wheel.stuckTime > 0.5 ? 'stuck' : (!wheel.ready ? 'homing' : 'ready'))}
            </td>
          </tr>
        ) }
        </tbody></table>

        <div>Battery: {telemetry.downlow?.batteryVoltage}V</div>

        <div>CPU temp: {Math.round(telemetry.controller.cpuTemperature)}&deg;C</div>
      </>
    }
  </div>
}

export default Indicators
