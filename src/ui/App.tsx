import React, { useEffect } from 'react'
import { RecoilRoot, useSetRecoilState } from 'recoil'
import { MuiThemeProvider, createMuiTheme, makeStyles } from '@material-ui/core/styles'
import { CssBaseline } from '@material-ui/core'
import { useMeasure } from 'react-use'

import Controls from './controls/Controls'
import Visualisation from './Visualisation'
import UpdateStateLoop from '../model/UpdateStateLoop'
import { appDimensionsState } from '../model/state'
import { fontSize } from '../settings'
import UpdateMotors from '../model/UpdateMotors'
import Indicators from './indicators/Indicators'
import Log from './indicators/Log'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons'

const theme = createMuiTheme({
  palette: {
    type: 'dark',
  },
  typography: {
    fontSize,
  },
})

const useStyles = makeStyles(() => ({
  root: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    userSelect: 'none',
    overflow: 'hidden',
  },

  closeButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 1000,
  },
}))

function AppWrap () {
  return (
    <RecoilRoot>
      <MuiThemeProvider theme={theme}>
        <CssBaseline>
          <App />
        </CssBaseline>
      </MuiThemeProvider>
    </RecoilRoot>
  )
}

function App () {
  const classes = useStyles()

  const setAppDimensionsState = useSetRecoilState(appDimensionsState)

  const [ref, { width, height }] = useMeasure()

  useEffect(
    () => setAppDimensionsState({ width, height }),
    [setAppDimensionsState, width, height]
  )

  return (
    <div className={classes.root} ref={ref}>
      <UpdateStateLoop />
      <UpdateMotors />
      <Visualisation />
      <Controls />
      <Indicators />
      <Log />
      <FontAwesomeIcon
        icon={faTimesCircle} size='1x'
        className={classes.closeButton}
        onClick={window.close}
      />
    </div>
  )
}

export default AppWrap
