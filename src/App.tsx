import React from 'react';
import { RecoilRoot } from 'recoil';
import { MuiThemeProvider, createMuiTheme, makeStyles } from '@material-ui/core/styles';
import { CssBaseline } from '@material-ui/core';

import Controls from './Controls';
import Visualisation from './Visualisation';
import Simulation from './Simulation';


const theme = createMuiTheme({
  palette: {
    type: 'dark',
  },
});


const useStyles = makeStyles(theme => ({
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
        marginRight: '10px'
      },
    },
  }
}));


function App() {
  const classes = useStyles();

  return (
    <RecoilRoot>
      <MuiThemeProvider theme={theme}>
        <CssBaseline>
          <div 
            className={classes.root}
          >
            <Simulation/>
            <Controls />
            <Visualisation />
          </div>
        </CssBaseline>
      </MuiThemeProvider>
    </RecoilRoot>
  );
}

export default App;
