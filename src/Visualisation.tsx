import React from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Group, Line, Circle } from 'react-konva';
import { useRecoilValue } from 'recoil';
import {useMeasure} from 'react-use';

import { vehicleState } from './state';
import { makeStyles } from '@material-ui/core';
import { bedSize, visualScale as scale, wheelDiameter, wheelPositions, wheelWidth } from './constants';


Konva.angleDeg = false;


const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  }
}));


export default function Visualisation() {
  const vehicle = useRecoilValue(vehicleState);

  const [ref, { width, height }] = useMeasure();

  const classes = useStyles();

  const gridlines = []
  for (let x = 0; x < width/scale; x += 1000)
    gridlines.push(
      <Line key={'gv'+x} points={[x, 0, x, height/scale]} stroke="grey" strokeWidth={0.5/scale} />
    );
  for (let y = 0; y < height/scale; y += 1000)
    gridlines.push(
      <Line key={'gh'+y} points={[0, y, width/scale, y]} stroke="grey" strokeWidth={0.5/scale} />
    );
  
  return (
    // @ts-ignore
    <div className={classes.root} ref={ref}>
      <Stage width={width} height={height} scaleX={scale} scaleY={scale}>
        <Layer>
          { gridlines }
          
          <Group
            {...vehicle.centre}
            rotation={vehicle.rotation}
          >
            <Circle offsetY={bedSize[1]/2} radius={100} fill="orange" />
            <Rect 
              width={bedSize[0]}
              height={bedSize[1]}
              offsetX={bedSize[0]/2}
              offsetY={bedSize[1]/2}
              fill="#098"
            />
            
            { vehicle.wheels.map((wheel, idx) => 
              <Group key={`wheel-${idx}`}
                x={wheelPositions[idx][0]} 
                y={wheelPositions[idx][1]}
                rotation={wheel.rotation}
              >
                <Circle offsetX={-wheelDiameter/2} radius={wheelWidth/2} fill="orange" />
                <Rect 
                  width={wheelDiameter}
                  height={wheelWidth}
                  offsetX={wheelDiameter/2}
                  offsetY={wheelWidth/2}
                  fill="#333"
                />
              </Group>
            )}
          </Group>

          <Line points={[vehicle.centre.x, vehicle.centre.y, vehicle.pivot.x, vehicle.pivot.y]} stroke="pink" strokeWidth={0.5/scale} />
          <Circle 
            x={vehicle.pivot.x}
            y={vehicle.pivot.y}
            radius={100}
            stroke="pink" 
            strokeWidth={2/scale}
          />
        </Layer>
      </Stage>
    </div>
  )
}
