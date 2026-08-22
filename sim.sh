#!/bin/bash

# Run in simulation mode

export XDG_CONFIG_HOME="/home/oliver/.config"
export REACT_APP_SIMULATION_MODE=true

# Electron 13 predates Chromium's Wayland support, so it renders through
# XWayland and needs the X11 DISPLAY variable. Some terminals run without one
# (Visual Studio Code, for instance, is launched with DISPLAY unset so that it
# uses Wayland directly), and Electron responds to a missing display by
# aborting with the obscure message "The futex facility returned an unexpected
# error code." Take the display from the session manager when the environment
# does not supply one.
if [ -z "$DISPLAY" ]; then
  export DISPLAY="$(systemctl --user show-environment 2>/dev/null | sed -n 's/^DISPLAY=//p')"
fi
if [ -z "$DISPLAY" ]; then
  echo "sim.sh: no X11 display available; Electron cannot open a window." >&2
  exit 1
fi

npm run electron:start
