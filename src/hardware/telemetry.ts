import { Telemetry, WheelTelemetry } from '../model/types'
import { getDriveMotorControllerTelemetry, getDriveMotorTelemetry } from './driveMotorController'
import fsType from 'fs'
import { getDownlowWheelTelemetry, getDownlowTelemetry } from './downlowController'
import { wheelCount } from '../settings'
import _ from 'lodash'
const fs = window.require('fs') as typeof fsType

let cpuTemperature = 0
const updateCpuTemp = () => {
  cpuTemperature = parseInt(fs.readFileSync('/sys/class/thermal/thermal_zone0/temp').toString()) / 1000
  setTimeout(updateCpuTemp, 1000)
}
updateCpuTemp()

export function getTelemetry ():Telemetry {
  const driveMotorTelemetry = getDriveMotorTelemetry()
  const steeringTelemetry = getDownlowWheelTelemetry()
  const wheels:WheelTelemetry[] = _.range(wheelCount).map(wi => ({
    ...driveMotorTelemetry[wi],
    ...steeringTelemetry[wi],
  }))

  return {
    motorControllers: getDriveMotorControllerTelemetry(),
    downlow: getDownlowTelemetry(),
    controller: {
      cpuTemperature,
    },
    wheels,
  }
}
