import React, { useCallback } from 'react';
import TextField from '@material-ui/core/TextField';
import { useRecoilState, useResetRecoilState } from 'recoil';

import { controlKeyPadState, driveModeState, frameRateState, vehicleState } from './state';
import { MousePad, KeyPad } from './ControlPad';
import { Button } from '@material-ui/core';
import DriveModeSelector from './DriveModeSelector';


export default function Controls() {
  const [ frameRate, setFrameRate ] = useRecoilState(frameRateState);
  
  const resetVehicleState = useResetRecoilState(vehicleState);
  const resetControlKeyPadState = useResetRecoilState(controlKeyPadState);
  // const resetControl1DState = useResetRecoilState(control1DState);
  const resetFrameRateState = useResetRecoilState(frameRateState);
  const resetDriveMode = useResetRecoilState(driveModeState);

  const reset = useCallback(() => {
    resetVehicleState();
    resetControlKeyPadState();
    // resetControl1DState();
    resetFrameRateState();
    resetDriveMode();
  }, [resetVehicleState, resetControlKeyPadState, resetFrameRateState, resetDriveMode]);
  
  return (
    <div className="Controls">
      <h4>Direction</h4>
      <KeyPad />

      {/* <h4>Spin rate</h4>
      <KeySlider /> */}

      <h4>Pivot point</h4>
      <MousePad />

      <h4>Drive mode</h4>
      <DriveModeSelector />
      
      <h4>Settings</h4>
      <TextField 
          id="framerate"
          label="Frame rate (FPS)"
          type="number"
          InputLabelProps={{
            shrink: true,
          }}
          InputProps={{ inputProps: { min: "1", max: "30" } }}
          variant="filled"
          value={frameRate}
          onChange={e => setFrameRate(parseInt(e.target.value))}
        />

        <Button onClick={reset}>Reset</Button>
    </div>
  )
}
