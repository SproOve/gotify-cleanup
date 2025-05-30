#!/bin/bash

set -e

cd "$(dirname "$0")"

# Vorheriges ZIP löschen
rm -f gotify-cleanup.zip

node index.js
# Docker-Image bauen
docker build -t gotify-cleanup .

# ZIP-Archiv erstellen (ohne node_modules, ohne config.json)
zip -r gotify-cleanup.zip . -x "node_modules/*" -x "config.json" -x "*.zip"

echo "Fertig: gotify-cleanup.zip erstellt."