import React, { useEffect } from 'react'
import { RecoilRoot, useSetRecoilState } from 'recoil'
import { MuiThemeProvider, createMuiTheme, makeStyles } from '@material-ui/core/styles'
import { CssBaseline } from '@material-ui/core'
import { useMeasure } from 'react-use'

import Controls from './controls/Controls'
import Visualisation from './Visualisation'
import Simulation from './Simulation'
import { appDimensionsState } from './state'

const theme = createMuiTheme({
  palette: {
    type: 'dark',
  },
})

const useStyles = makeStyles(() => ({
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'row',

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
  const classes = useStyles()

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
      <Controls />
      <Visualisation />
    </div>
  )
}

export default AppWrap
