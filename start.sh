#!/bin/sh
if [ ! -f config.json ]; then
  cp config_set/config.json config.json
  echo "Default config.json kopiert."
fi

exec node index.js