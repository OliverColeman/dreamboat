import React, { useCallback, PointerEvent } from 'react';
import { makeStyles } from '@material-ui/core';
import { useRecoilState } from 'recoil';

import { controlKeyPadState, controlMouseState, Point } from './state';
import { useHotkeys } from 'react-hotkeys-hook';

const size = 241;
const pointSize = 10;

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: 'grey',
    height: size,
    width: size,
    position: 'relative',
    marginBottom: 8,
  },
  vertAxis: {
    position: 'absolute',
    left: (size-1)/2,
    width:1,
    height:size,
    backgroundColor:"#333",
  },
  horzAxis: {
    position: 'absolute',
    top: (size-1)/2,
    width:size,
    height:1,
    backgroundColor:"#333",
  },
  value: (coords:Point) => ({
    position: 'absolute',
    top: (coords.y / 2 + 0.5) * size - pointSize/2,
    left: (coords.x / 2 + 0.5) * size - pointSize/2,
    width:pointSize,
    height:pointSize,
    borderRadius: pointSize/2,
    backgroundColor:"#00f",
  })
}));



export const MousePad = React.memo(function MousePad() {
  const [ coords, setCoords ] = useRecoilState(controlMouseState);
  
  const pointerMoveHandler = useCallback((e: PointerEvent<HTMLDivElement>) => {
    // Get relative mouse coordinates scaled to [-1, 1]
    const x = ((e.clientX-e.currentTarget.offsetLeft) / e.currentTarget.clientWidth) * 2 - 1;
    const y = ((e.clientY-e.currentTarget.offsetTop) / e.currentTarget.clientHeight) * 2 - 1;
    setCoords({x, y});
  }, [setCoords]);
  
  const classes = useStyles(coords);

  return (
    <div 
      className={classes.root}
      onPointerMove={pointerMoveHandler}
      onPointerLeave={() => setCoords({x:0, y:0})}  
    >
      <div className={classes.vertAxis} />
      <div className={classes.horzAxis} />
      <div className={classes.value} />
    </div>
  )
})


export const KeyPad = React.memo(function KeyPad() {
  const [ coords, setCoords ] = useRecoilState(controlKeyPadState);
  
  useHotkeys('w', () => setCoords(coords => ({ x: coords.x, y: Math.max(-1, coords.y - 0.05)}) ));
  useHotkeys('s', () => setCoords(coords => ({ x: coords.x, y: Math.min(1, coords.y + 0.05)}) ));
  useHotkeys('a', () => setCoords(coords => ({ y: coords.y, x: Math.max(-1, coords.x - 0.05)}) ));
  useHotkeys('d', () => setCoords(coords => ({ y: coords.y, x: Math.min(1, coords.x + 0.05)}) ));
  
  const classes = useStyles(coords);

  return (
    <div 
      className={classes.root}
    >
      <div className={classes.vertAxis} />
      <div className={classes.horzAxis} />
      <div className={classes.value} />
    </div>
  )
})
