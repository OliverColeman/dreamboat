#!/bin/bash

# Run the application on the vehicle from the Create React App development server, with the code
# reloading as it is edited. Needs sudo for /dev/mem, which the joystick analogue-to-digital
# converter (ADC) is read through over the serial peripheral interface (SPI).
#
# The development server serves an unminified bundle and keeps a watcher and a hot-reload channel
# open, and React runs its development build behind it, so the whole render path costs more per
# frame than the bundle run.sh builds. Use this for working on the code, and run.sh for anything
# that depends on the update loop keeping up.
#
# Create React App inlines REACT_APP_* variables when the development server starts, so --enable-log
# is set for that process rather than for the application.

set -e

usage() {
  cat <<'USAGE'
Usage: ./rundev.sh [--enable-log]

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
      echo "rundev.sh: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

export XDG_CONFIG_HOME="/home/oliver/.config"

# sudo resets the environment, so the variable is handed over through `env` rather than exported.
sudo env REACT_APP_ENABLE_LOG="$enable_log" npm run electron:start
