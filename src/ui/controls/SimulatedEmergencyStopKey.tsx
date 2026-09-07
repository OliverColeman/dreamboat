import React, { useEffect } from 'react'

import { toggleSimulatedEmergencyStop } from '../../hardware/downlowController'

/** Binds the `e` key to the simulated emergency stop, engaging it when it is disengaged and
 * disengaging it when it is engaged. The vehicle has a switch to throw instead, so the controls
 * mount this only in simulation mode. It draws nothing.
 *
 * The listener sits on the document, where keyboard events arrive whatever holds the focus, so the
 * key answers while a Material-UI radio input holds it after a drive mode is chosen. It is a
 * listener of its own rather than a react-hotkeys-hook binding because hotkeys-js compares the whole
 * set of keys currently held against the shortcut's key set and runs the handler only when the two
 * are equal, which drops `e` for as long as any other key is down, including `w`, the key the
 * operator holds to accelerate. The keypad keeps its own react-hotkeys-hook bindings; hotkeys-js
 * listens on the document too, and neither listener suppresses the other.
 *
 * The handler holds no state and so needs no dependencies: which way the stop is set is a field of
 * the simulated downlow controller, and the controller is what flips it. The copy of that field
 * which telemetry carries into the vehicle state trails it by up to one telemetry poll, so a
 * handler that read the copy to decide what to write back would lose the second of two presses
 * made within one poll.
 *
 * A held key repeats, and every repeat arrives as another press, so only the first is acted on;
 * otherwise the stop would flip at the key repeat rate for as long as the key was held, and where
 * it ended up would depend on how long that was. Shift is accepted, so that the key answers to
 * both `e` and `E`; the control, alt and meta modifiers are not, since those presses belong to the
 * shortcuts of the browser and the window manager.
 */
export default React.memo(function SimulatedEmergencyStopKey () {
  useEffect(() => {
    const onKeyDown = (event:KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
      if (event.key.toLowerCase() !== 'e') return
      toggleSimulatedEmergencyStop()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
})
