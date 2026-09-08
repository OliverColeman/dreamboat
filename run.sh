#!/bin/bash

# Run on the vehicle. Needs sudo for /dev/mem, which the joystick analogue-to-digital converter (ADC)
# is read through over the serial peripheral interface (SPI).

set -e

usage() {
  cat <<'USAGE'
Usage: ./run.sh [--enable-log]

  --enable-log  Record a telemetry log while running: a comma separated values (CSV) file with one
                row per iteration of the update loop, holding the control inputs, the target and
                achieved pivot points, and the target, commanded and reported state of each wheel.
                Written to the directory named by `telemetryLogDirectory` in src/settings.ts.
                Off unless this option is given.
  -h, --help    Show this message.
USAGE
}

enable_log=false

while [ $# -gt 0 ]; do
  case "$1" in
    --enable-log)
      enable_log=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "run.sh: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

export XDG_CONFIG_HOME="/home/oliver/.config"

# Create React App inlines REACT_APP_* variables when the application is started, so the variable has
# to be set for the process running `npm start`. sudo resets the environment, so it is handed over
# through `env` rather than exported.
sudo env REACT_APP_ENABLE_LOG="$enable_log" npm run electron:start
