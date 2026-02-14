#!/bin/sh
set -e

# if $DEBUG is set to 1, run in debug mode
# elif $DEBUG is set to 0, run in prod mode
# else default to debug mode

if [ "$DEBUG" = "1" ]; then
  uv run --active fastapi dev app/main.py --host 0.0.0.0 --port 8000 --reload
elif [ "$DEBUG" = "0" ]; then
  uv run --active fastapi run app/main.py --host 0.0.0.0 --port 8000 --workers 1
else
  uv run --active fastapi dev app/main.py --host 0.0.0.0 --port 8000 --reload
fi
