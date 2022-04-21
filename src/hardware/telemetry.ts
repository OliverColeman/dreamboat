import { Telemetry } from '../model/types'
import { getMotorControllerState } from './motor'
import fsType from 'fs'
import { logger } from '../util'
const fs = window.require('fs') as typeof fsType

let cpuTemperature = 0
const updateCpuTemp = () => {
  try {
    cpuTemperature = parseInt(fs.readFileSync('/sys/class/thermal/thermal_zone0/temp').toString()) / 1000
    setTimeout(updateCpuTemp, 1000)
  } catch (err) {
    logger.error(err)
  }
}
updateCpuTemp()

export function getTelemetry (): Telemetry {
  return {
    motorControllers: getMotorControllerState(),
    controller: {
      cpuTemperature,
    },
  }
}
