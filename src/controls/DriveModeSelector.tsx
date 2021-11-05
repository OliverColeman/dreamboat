import React from 'react'
import { useRecoilState } from 'recoil'
import { FormControlLabel, Radio, RadioGroup } from '@material-ui/core'
import { useHotkeys } from 'react-hotkeys-hook'

import { driveModeState } from '../state'
import { DriveMode, fontSize } from '../constants'

const driveModeLabel = (mode:DriveMode) => mode.replaceAll('_', ' ').toLowerCase()

export default function DriveModeSelector () {
  const [driveMode, setDriveMode] = useRecoilState(driveModeState)

  useHotkeys('1', () => setDriveMode(DriveMode.DRIVE_MY_CAR))
  useHotkeys('2', () => setDriveMode(DriveMode.DAY_TRIPPER))
  useHotkeys('3', () => setDriveMode(DriveMode.TWIST_AND_SHOUT))

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
