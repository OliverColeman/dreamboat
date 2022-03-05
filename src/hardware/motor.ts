
import _ from 'lodash'
import { SabertoothUSB, SingleChannel, listSabertoothDevices } from 'sabertooth-usb'

import { MotorControllerState, VehicleState } from '../model/types'
import { driveMotorSerialNumbers, maxSpeed, motorControllerStateUpdateInterval, motorsPerController, motorControllerMaxMotorOutputRate, motorControllerMaxCurrentPerMotor } from '../settings'

const motorController:Array<SabertoothUSB> = [null, null]

listSabertoothDevices().then(devices =>
  driveMotorSerialNumbers.forEach((serialNumber, mcIndex) => {
    motorController[mcIndex] = new SabertoothUSB(
      devices.find(d => d.serialNumber === serialNumber).path,
      {
        baudRate: 115200,
        maxMotorOutputRate: motorControllerMaxMotorOutputRate,
      }
    )

    motorController[mcIndex].setCurrentLimit('*', motorControllerMaxCurrentPerMotor)
  })
)

// This is updated asynchronously and is intended to be mutable.
// Periodically the structure is deep-copied into a recoil state value.
const motorControllerState:MotorControllerState[] = motorController.map(() => ({
  connected: false,
  batteryVoltage: 0,
  motors: _.range(motorsPerController).map(() => ({ rate: 0, current: 0, temperature: 0 })),
  error: null,
}))

const mcGood = (motorState:MotorControllerState) => motorState.connected && !motorState.error

export const updateWheels = (vehicle:VehicleState) => {
  // If the motor controllers have been initialised.
  if (motorController[0] !== null) {
    const { wheels } = vehicle

    let allGood = mcGood(motorControllerState[0]) && mcGood(motorControllerState[1])
    wheels.forEach((wheel, wheelIndex) => {
      const mcIndex = Math.floor(wheelIndex / motorsPerController)
      const motorChannel = wheelIndex % motorsPerController + 1 as SingleChannel

      try {
        if (!allGood) {
          // Stop motors if any motor controller disconnected or has error.
          motorController[mcIndex].setMotor(motorChannel, 0)
        } else {
          // Allows for numerical imprecision, eg sometimes a rate of 1.000000000002 can occur as a result of the division.
          const rate = Math.min(1, Math.max(-1, wheel.speed / maxSpeed))
          motorController[mcIndex].setMotor(motorChannel, rate)
        }
      } catch (err) {
        allGood = false
        motorControllerState[mcIndex].error = '' + err
      }
    })
  }
}

export const getMotorControllerState = () => _.cloneDeep(motorControllerState)

// Periodically updates the internal mutable record of controller state and stats.
const updateMotorControllerState = async () => {
  const updateStarted = Date.now()

  // If the motor controllers have been initialised.
  if (motorController[0] !== null) {
    for (let mci = 0; mci < motorController.length; mci++) {
      const mc = motorController[mci]
      const mcs = motorControllerState[mci]
      mcs.connected = mc.isConnected()

      if (mcs.connected) {
        try {
          mcs.batteryVoltage = await mc.getBatteryVoltage()
          for (let mi = 0; mi < motorsPerController; mi++) {
            // Divide rate by motorControllerMaxMotorOutputRate so we get range [0, 1].
            mcs.motors[mi].rate = (await mc.getMotorDriverOutputRate(mi + 1 as SingleChannel)) / motorControllerMaxMotorOutputRate
            mcs.motors[mi].current = await mc.getMotorCurrent(mi + 1 as SingleChannel)
            mcs.motors[mi].temperature = await mc.getMotorDriverOutputTemperature(mi + 1 as SingleChannel)
          }
          mcs.error = null
        } catch (err) {
          mcs.error = '' + err
        }
      } else {
        mcs.error = '' + mc.getLastError()
      }
    }
  }

  // Update no more frequently than motorControllerStateUpdateInterval
  // This allows for the update taking longer than the desired interval.
  setTimeout(updateMotorControllerState, Math.max(1, motorControllerStateUpdateInterval - (Date.now() - updateStarted)))
}

// Start process to periodically update motor controller state and stats.
updateMotorControllerState()
