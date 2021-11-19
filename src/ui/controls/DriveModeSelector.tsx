import React from 'react'
import { useRecoilState } from 'recoil'
import { FormControlLabel, Radio, RadioGroup } from '@material-ui/core'

import { driveModeState } from '../../model/state'
import { fontSize } from '../../settings'
import { DriveMode, driveModeLabels } from '../../model/types'

const driveModeLabel = (mode:DriveMode) => driveModeLabels[mode] // mode.replaceAll('_', ' ').toLowerCase()

export default function DriveModeSelector () {
  const [driveMode, setDriveMode] = useRecoilState(driveModeState)

  // useHotkeys('1', () => setDriveMode(DriveMode.DRIVE_MY_CAR))
  // useHotkeys('2', () => setDriveMode(DriveMode.DAY_TRIPPER))
  // useHotkeys('3', () => setDriveMode(DriveMode.HELTER_SKELTER))

  return (
    <RadioGroup
      aria-label="drive mode"
      name="drivemode"
      value={driveMode}
      onChange={(e, v) => setDriveMode(v as DriveMode)}
      style={{ fontSize }}
    >
      { Object.keys(DriveMode).map((value) =>
        <FormControlLabel
          value={value as DriveMode}
          control={<Radio />}
          label={driveModeLabel(value as DriveMode)}
          key={`drivemodeoption-${value}`}
        />
      )}
    </RadioGroup>
  )
}
