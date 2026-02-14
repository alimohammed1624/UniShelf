#!/bin/sh
set -e

if [ "$DEBUG" = "1" ]; then
  echo "Starting frontend in DEVELOPMENT mode (hot-reload enabled)"
  exec bun run dev
elif [ "$DEBUG" = "0" ]; then
  echo "Starting frontend in PRODUCTION mode"
  bun run build
  exec bun run start
else
  echo "Starting frontend in DEVELOPMENT mode (hot-reload enabled)"
  exec bun run dev
fi
