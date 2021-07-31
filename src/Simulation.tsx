import { useEffect } from 'react';
import { useRecoilCallback, useRecoilValue } from 'recoil';

import { updateVehicleState, frameRateState } from './state';


function Simulation() {
  const updateVehicleStateCallback = useRecoilCallback(updateVehicleState);

  const frameRate = useRecoilValue(frameRateState);

  useEffect(() => {
    const intervalHandle = setInterval(updateVehicleStateCallback, 1000 / frameRate);
    return () => clearInterval(intervalHandle);
  }, [updateVehicleStateCallback, frameRate]);
  
  return null
}

export default Simulation;
