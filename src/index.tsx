import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

// Require rpio like this because https://stackoverflow.com/questions/43966353/electron-angular-fs-existssync-is-not-a-function
const rpio = window.require('rpio')

const blinkOn = () => {
  console.log('H')
  rpio.write(16, rpio.HIGH)
  setTimeout(blinkOff, 500)
}
const blinkOff = () => {
  rpio.write(16, rpio.LOW)
  setTimeout(blinkOn, 500)
}
rpio.open(16, rpio.OUTPUT, rpio.LOW)
blinkOn()

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
