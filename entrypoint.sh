#!/bin/sh
set -e

if [ ! -f /app/config/config.json ]; then
  echo "Copying example config to /app/config/config.json ..."
  cp /app/config_set/config.json /app/config/config.json
else
  echo "/app/config/config.json already exists. No copy needed."
fi

exec node index.js
