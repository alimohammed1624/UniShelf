#!/bin/sh
set -e

if [ "$DEBUG" = "1" ]; then
  exec bun run dev
elif [ "$DEBUG" = "0" ]; then
  # Check if standalone build exists; if not, build it first
  if [ ! -f ".next/standalone/server.js" ]; then
    echo "Production build not found, building now..."
    bun run build
  fi
  exec bun .next/standalone/server.js
else
  exec bun run dev
fi
