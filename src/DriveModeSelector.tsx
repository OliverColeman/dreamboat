import React from 'react';
import { useRecoilState } from 'recoil';

import { DriveMode, driveModeState } from './state';
import { FormControlLabel, Radio, RadioGroup } from '@material-ui/core';
import { enumValues } from './util';
import { useHotkeys } from 'react-hotkeys-hook';


export default function DriveModeSelector() {
  const [ driveMode, setDriveMode ] = useRecoilState(driveModeState);

  useHotkeys('1', () => setDriveMode(0));
  useHotkeys('2', () => setDriveMode(1));
  useHotkeys('3', () => setDriveMode(2));
    
  return (
    <RadioGroup aria-label="drive mode" name="drivemode" value={driveMode} onChange={(e, v) => setDriveMode(parseInt(v))}>
      { enumValues(DriveMode).map((value) => 
        <FormControlLabel 
          value={value as number} 
          control={<Radio />} 
          label={driveModeLabel(value as DriveMode)} 
          key={`drivemodeoption-${value}`}
        />
      )}
    </RadioGroup>
  )
}

const driveModeLabel = (mode:DriveMode) => DriveMode[mode].toString().replaceAll('_',' ').toLowerCase();
