import React, { useEffect } from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Group, Line, Circle } from 'react-konva';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import {useMeasure} from 'react-use';

import { vehicleState, visualisationDimensionsState } from './state';
import { makeStyles } from '@material-ui/core';
import { bedSize, visualScale as scale, visualScale, wheelDiameter, wheelPositions, wheelWidth } from './constants';


Konva.angleDeg = false;


const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  }
}));


export default function Visualisation() {
  const setVisualisationDimensionsState = useSetRecoilState(visualisationDimensionsState);
  const vehicle = useRecoilValue(vehicleState);

  const [ref, { width, height }] = useMeasure();

  useEffect(
    () => setVisualisationDimensionsState({width:width/visualScale, height:height/visualScale}),
    [setVisualisationDimensionsState, width, height]
  );

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
            {...vehicle.centreAbs}
            rotation={vehicle.rotationPredicted}
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

          <Line points={[vehicle.centreAbs.x, vehicle.centreAbs.y, vehicle.pivotAbs.x, vehicle.pivotAbs.y]} stroke="pink" strokeWidth={0.5/scale} />
          <Circle 
            x={vehicle.pivotAbs.x}
            y={vehicle.pivotAbs.y}
            radius={100}
            stroke="pink" 
            strokeWidth={2/scale}
          />
        </Layer>
      </Stage>
    </div>
  )
}
