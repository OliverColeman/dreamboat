#!/bin/bash

# Run the application on the vehicle, from the bundle in build/.
#
# The bundle is kept between runs and is rebuilt only when --build is given, because a build takes a
# few minutes on the Raspberry Pi. The build is run as the invoking user, so the build directory is
# not left owned by root, and only the application itself is run under sudo, which it needs for
# /dev/mem: the joystick analogue-to-digital converter (ADC) is read over the serial peripheral
# interface (SPI).
#
# Create React App inlines REACT_APP_* variables into the bundle as it builds it, so --enable-log is
# a property of the bundle rather than of the environment the application is run in, and changing it
# means building again.
#
# Use rundev.sh to run from the development server instead. The built bundle carries none of the
# development server's overhead, and the update loop runs measurably closer to the configured
# `frameRate` on it.

set -e

usage() {
  cat <<'USAGE'
Usage: ./run.sh [--build] [--enable-log]

  --build       Build the bundle before running it. Without this the bundle already in build/ is run
                as it is, which is what makes starting quick; build after changing the source, or to
                change whether a telemetry log is recorded.
  --enable-log  Record a telemetry log: a comma separated values (CSV) file with one row per
                iteration of the update loop, holding the control inputs, the target and achieved
                pivot points, and the target, commanded and reported state of each wheel. Written to
                the directory named by `telemetryLogDirectory` in src/settings.ts. Off unless this
                option is given. Takes effect through the build, so it needs --build alongside it.
  -h, --help    Show this message.
USAGE
}

build=false
enable_log=false

while [ $# -gt 0 ]; do
  case "$1" in
    --build)
      build=true
      ;;
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

if [ "$build" = true ]; then
  echo "run.sh: building (a few minutes on the Raspberry Pi)..."
  REACT_APP_ENABLE_LOG="$enable_log" npm run build
else
  if [ ! -f build/index.html ]; then
    echo "run.sh: build/ holds no bundle to run; give --build to make one." >&2
    exit 1
  fi
  if [ "$enable_log" = true ]; then
    echo "run.sh: --enable-log has no effect without --build, because whether the telemetry log is" >&2
    echo "        recorded is fixed when the bundle is built." >&2
  fi
  echo "run.sh: running the bundle in build/, made $(date -r build/index.html '+%Y-%m-%d %H:%M')."
fi

sudo npm run electron:built
