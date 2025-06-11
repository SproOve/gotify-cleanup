#!/bin/bash

# Error handling: Always wait for user input on error
function pause_on_error {
  echo "\nERROR occurred!"
  read -p "Press any key to exit..."
  exit 1
}
trap pause_on_error ERR

# 1. Generate Dockerfile
cat <<EOF > Dockerfile
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache nano
COPY index.js ./
COPY package.json ./
COPY logger.js ./
COPY config_set ./config_set
RUN mkdir -p config
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh
RUN npm install --production
ENTRYPOINT ["./entrypoint.sh"]
EOF

echo "Dockerfile created."

# 2. Generate docker-compose.yml
cat <<EOF > docker-compose.yml
services:
  gotify-cleanup:
    image: sproove/gotify-cleanup:latest
    container_name: gotify-cleanup
    restart: unless-stopped
    volumes:
      - gotify_cleanup_config:/app/config
volumes:
    gotify_cleanup_config:
      name: gotify_cleanup_config

EOF

echo "docker-compose.yml created."

# 3. requirements.txt (not needed, Node.js)

# 4. Build Docker image
DOCKER_IMAGE_NAME=gotify-cleanup:latest
docker build -t $DOCKER_IMAGE_NAME .
echo "Docker image built: $DOCKER_IMAGE_NAME"

# 5. Export image as TAR
TARFILE=gotify-cleanup.tar
docker save -o "$TARFILE" $DOCKER_IMAGE_NAME

echo "Docker image saved as TAR: $TARFILE"

# 6. Delete old ZIP if exists
ZIPFILE=gotify-cleanup-portainer.zip
if [ -f "$ZIPFILE" ]; then
  rm "$ZIPFILE"
  echo "Old ZIP deleted."
fi

# 7. ZIP the TAR file
if command -v zip &> /dev/null; then
  zip "$ZIPFILE" "$TARFILE"
else
  echo "'zip' not found, trying PowerShell to zip..."
  powershell -Command "Compress-Archive -Path '$TARFILE' -DestinationPath '$ZIPFILE' -Force"
  if [ $? -ne 0 ]; then
    echo "Error creating ZIP archive with PowerShell."
    read -p "Press any key to exit..."
    exit 1
  fi
fi

echo "Done: $ZIPFILE created for Portainer import."

# Wait for user input before closing the window
read -p "Press any key to exit..."
