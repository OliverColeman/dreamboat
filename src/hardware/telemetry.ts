import sysinfoType from 'systeminformation'
import { Telemetry } from '../model/types'
import { getMotorControllerState } from './motor'
const systeminformation = window.require('systeminformation') as typeof sysinfoType

let cpuTemperature = 0
const updateCpuTemp = async () => {
  cpuTemperature = (await systeminformation.cpuTemperature()).main
  setTimeout(updateCpuTemp, 1000)
}
updateCpuTemp()

export function getTelemetry ():Telemetry {
  return {
    motorControllers: getMotorControllerState(),
    controller: {
      cpuTemperature,
    },
  }
}
