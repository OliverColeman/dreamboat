
import _ from 'lodash'
import { SabertoothUSB, SingleChannel, listSabertoothDevices } from 'sabertooth-usb'

import { DriveMotorControllerTelemetry, VehicleState, WheelDriveTelemetry } from '../model/types'
import { driveMotorSerialNumbers, maxVehicleSpeed, motorControllerTelemetryUpdateInterval, motorsPerController, motorControllerMaxMotorOutputRate, motorControllerMaxCurrentPerMotor, usbBaudRate, usbGetRetryTimeout, usbMaxGetAttempts, wheelCount } from '../settings'

const motorController:Array<SabertoothUSB> = [null, null]

listSabertoothDevices().then(devices =>
  driveMotorSerialNumbers.forEach((serialNumber, mcIndex) => {
    motorController[mcIndex] = new SabertoothUSB(
      devices.find(d => d.serialNumber === serialNumber).path,
      {
        baudRate: usbBaudRate,
        timeout: usbGetRetryTimeout,
        maxMotorOutputRate: motorControllerMaxMotorOutputRate,
        maxGetAttemptCount: usbMaxGetAttempts,
      }
    )

    motorController[mcIndex].setCurrentLimit('*', motorControllerMaxCurrentPerMotor)
    motorController[mcIndex].setRamping('*', 2000)
  })
)

// This is updated asynchronously and is intended to be mutable.
// Periodically the structure is deep-copied into a recoil state value.
const controllerTelemetry:DriveMotorControllerTelemetry[] = motorController.map(() => ({
  connected: false,
  batteryVoltage: 0,
  error: null,
}))

const motorTelemetry:WheelDriveTelemetry[] = _.range(wheelCount).map(() => ({ driveRate: 0, driveCurrent: 0, driveOutputTemperature: 0 }))

const mcGood = (telemetry:DriveMotorControllerTelemetry) => telemetry.connected && !telemetry.error

export const updateWheels = (vehicle:VehicleState) => {
  // If the motor controllers have been initialised.
  if (motorController[0] !== null) {
    const { wheelsNext: wheels } = vehicle

    let allGood = mcGood(controllerTelemetry[0]) && mcGood(controllerTelemetry[1])
    wheels.forEach((wheel, wheelIndex) => {
      const mcIndex = Math.floor(wheelIndex / motorsPerController)
      const motorChannel = wheelIndex % motorsPerController + 1 as SingleChannel

      try {
        if (!allGood) {
          // Stop motors if any motor controller disconnected or has error.
          motorController[mcIndex].setMotor(motorChannel, 0)
        } else {
          // Allows for numerical imprecision, eg sometimes a rate of 1.000000000002 can occur as a result of the division.
          const rate = Math.min(1, Math.max(-1, wheel.speed / maxVehicleSpeed))
          motorController[mcIndex].setMotor(motorChannel, rate)
        }
      } catch (err) {
        allGood = false
        controllerTelemetry[mcIndex].error = '' + err
      }
    })
  }
}

export const getDriveMotorControllerTelemetry = () => _.cloneDeep(controllerTelemetry)
export const getDriveMotorTelemetry = () => _.cloneDeep(motorTelemetry)

// Periodically updates the internal mutable record of controller state and stats.
const updateMotorControllerTelemetry = async () => {
  const updateStarted = Date.now()

  // If the motor controllers have been initialised.
  if (motorController[0] !== null) {
    for (let mci = 0, wi = 0; mci < motorController.length; mci++) {
      const mc = motorController[mci]
      const mcs = controllerTelemetry[mci]
      mcs.connected = mc.isConnected()

      if (mcs.connected) {
        try {
          mcs.batteryVoltage = await mc.getBatteryVoltage()
          for (let mi = 0; mi < motorsPerController; mi++, wi++) {
            // Divide rate by motorControllerMaxMotorOutputRate so we get range [0, 1].
            motorTelemetry[wi].driveRate = (await mc.getMotorDriverOutputRate(mi + 1 as SingleChannel)) / motorControllerMaxMotorOutputRate
            motorTelemetry[wi].driveOutputTemperature = await mc.getMotorDriverOutputTemperature(mi + 1 as SingleChannel)
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
  setTimeout(updateMotorControllerTelemetry, Math.max(1, motorControllerTelemetryUpdateInterval - (Date.now() - updateStarted)))
}

// Start process to periodically update motor controller state and stats.
updateMotorControllerTelemetry()
