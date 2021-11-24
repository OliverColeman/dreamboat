import React, { useEffect } from 'react'
import { RecoilRoot, useSetRecoilState } from 'recoil'
import { MuiThemeProvider, createMuiTheme, makeStyles } from '@material-ui/core/styles'
import { CssBaseline } from '@material-ui/core'
import { useMeasure } from 'react-use'

import Controls from './controls/Controls'
import Visualisation from './Visualisation'
import Simulation from '../model/Simulation'
import { appDimensionsState } from '../model/state'
import { fontSize } from '../settings'

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
    display: 'flex',
    flexDirection: 'row',
    userSelect: 'none',

    '*': {
      border: '1px solid white',
      padding: '10px',
      borderRadius: '5px',
      boxSizing: 'border-box',

      margin: '10px 0 10px 10px',
      '&:last-child': {
        marginRight: '10px',
      },
    },
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
      <Simulation/>
      <Visualisation />
      <Controls />
    </div>
  )
}

export default AppWrap