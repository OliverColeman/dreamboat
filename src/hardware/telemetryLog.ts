import fsType from 'fs'
import pathType from 'path'
import _ from 'lodash'

import { maxVehicleSpeed, telemetryLogDirectory, telemetryLogEnabled, telemetryLogFlushInterval, wheelCount } from '../settings'
import { Coord, DriveMode, VehicleState } from '../model/types'
import { rad2Deg } from '../util'

// Require these like this because https://stackoverflow.com/a/43971252/1133481
let fs: typeof fsType
let path: typeof pathType

try {
  fs = window.require('fs')
  path = window.require('path')
} catch (e) {
  console.warn('Could not load fs, telemetry logging is disabled.', e)
}

/** Columns recorded for each wheel, in order. Prefixed with the wheel index in the header. */
const wheelColumns = [
  /** Angle the wheel would be at were there no limit on how fast it can steer, in degrees. */
  'TargetAngle',
  /** Angle the wheel is being commanded to, in degrees. */
  'CommandedAngle',
  /** Angle the wheel reports being at, in degrees. */
  'ActualAngle',
  /** Drive rate the wheel is being commanded at, in range [-1, 1]. */
  'CommandedDriveRate',
  /** Drive rate the wheel reports being driven at, in range [-1, 1]. */
  'ActualDriveRate',
  /** Rate the steering motor reports being driven at, in range [-1, 1]. The firmware steers with a
   * proportional loop, so this reaching 1 means the loop is saturated and the wheel is turning as
   * fast as it can, which is what identifies the maximum steering rate. */
  'ActualSteeringRate',
]

const columns = [
  /** Wall clock time the row was recorded, as an ISO 8601 timestamp. */
  'time',
  /** Milliseconds since the first row in this file, which is easier to plot against than the timestamp. */
  'elapsedMs',
  'control0X', 'control0Y', 'control1X', 'control1Y',
  'driveMode', 'emergencyStop', 'brakeEnabled',
  /** Pivot point asked for by the controls, relative to the vehicle centre, in mm. */
  'pivotTargetX', 'pivotTargetY',
  /** Pivot point the wheels are being aimed at, relative to the vehicle centre, in mm. */
  'pivotX', 'pivotY',
  ..._.range(wheelCount).flatMap(wi => wheelColumns.map(column => `w${wi}${column}`)),
]

/** Rows recorded since the last flush. Held in memory so the vehicle is not writing to disk every frame. */
let pendingRows: string[] = []
/** Path of the file being written, or null while no row has been recorded yet. */
let filePath: string | null = null
let firstRowTime = 0
/** Set once a write fails, so a broken log reports itself once rather than every frame. */
let writeFailed = false
/** The last iteration recorded, so an iteration recorded more than once contributes one row. */
let lastRecordedIteration = -1

const isEnabled = () => telemetryLogEnabled && !!fs && !writeFailed

/** Format a number for the file, dropping the trailing zeros that would otherwise treble its size. */
const num = (value: number, decimalPlaces: number) =>
  (Number.isFinite(value) ? +value.toFixed(decimalPlaces) : '').toString()

/** Create the log directory and start a new file, named for the time of the first row. */
function startFile (startedAt: Date) {
  fs.mkdirSync(telemetryLogDirectory, { recursive: true })
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-')
  filePath = path.join(telemetryLogDirectory, `dreamboat-${stamp}.csv`)
  fs.writeFileSync(filePath, columns.join(',') + '\n')
}

/** Write the rows recorded since the last flush, and forget them. */
function flush () {
  if (!filePath || pendingRows.length === 0) return
  const toWrite = pendingRows.join('\n') + '\n'
  pendingRows = []
  fs.appendFile(filePath, toWrite, err => {
    if (err && !writeFailed) {
      writeFailed = true
      console.warn(`Could not write the telemetry log at ${filePath}, logging is disabled.`, err)
    }
  })
}

/**
 * Record one row describing the vehicle state produced for this iteration, and the control inputs it
 * was produced from.
 * @param iteration Identifies the iteration of the update loop this state was produced for. React
 * invokes the state update more than once in some cases, and only the first is recorded.
 */
export function appendTelemetryLogRow (vehicle: VehicleState, control2d: Coord[], mode: DriveMode, iteration: number) {
  if (!isEnabled() || iteration === lastRecordedIteration) return
  lastRecordedIteration = iteration

  try {
    const now = new Date()
    if (filePath === null) {
      startFile(now)
      firstRowTime = now.getTime()
    }

    const downlow = vehicle.telemetry?.downlow
    const wheelTelemetry = downlow?.wheels ?? []

    const row = [
      now.toISOString(),
      now.getTime() - firstRowTime,
      num(control2d[0].x, 4), num(control2d[0].y, 4),
      num(control2d[1].x, 4), num(control2d[1].y, 4),
      mode,
      downlow?.emergencyStopTriggered ? 1 : 0,
      vehicle.brakeEnabled ? 1 : 0,
      num(vehicle.pivotTarget.x, 1), num(vehicle.pivotTarget.y, 1),
      num(vehicle.pivot.x, 1), num(vehicle.pivot.y, 1),
      ..._.range(wheelCount).flatMap(wi => [
        num(rad2Deg(vehicle.wheelsTarget[wi].angle), 2),
        num(rad2Deg(vehicle.wheelsNext[wi].angle), 2),
        wheelTelemetry[wi] ? num(rad2Deg(wheelTelemetry[wi].angle), 2) : '',
        // Recorded as a rate rather than a speed so it is directly comparable with the reported rate.
        num(vehicle.wheelsNext[wi].speed / maxVehicleSpeed, 4),
        wheelTelemetry[wi] ? num(wheelTelemetry[wi].driveRate, 4) : '',
        wheelTelemetry[wi] ? num(wheelTelemetry[wi].steeringRate, 4) : '',
      ]),
    ]

    pendingRows.push(row.join(','))
  } catch (e) {
    if (!writeFailed) {
      writeFailed = true
      console.warn('Could not record a telemetry log row, logging is disabled.', e)
    }
  }
}

/** Path of the file being written, for the user interface to show. Null until the first row is recorded. */
export const getTelemetryLogPath = () => filePath

if (telemetryLogEnabled && fs) {
  setInterval(flush, telemetryLogFlushInterval)
  // A row recorded in the last interval is still worth having when the window closes.
  window.addEventListener('beforeunload', flush)
}
