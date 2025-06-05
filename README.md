# Gotify Cleanup

This Node.js script automatically deletes old messages from your Gotify server for specified apps, keeping only the most recent ones per app.

## Features
- Periodically fetches all apps and messages from Gotify
- Keeps only the latest X messages per app (configurable)
- Supports multiple Gotify API keys (=multiple Users) and apps
- Can be run standalone or as a Docker container

## Configuration
- Either edit the `config_set/config.json` file before running the script or building the Docker image OR
- do it after deployment by logging into your container console with /bin/sh -> execute
```cmd
nano /config/config.json
```


Example:

```json
{
  "base_url": "http://your-gotify-url:8088",
  "gotify_keys": [
    { "key": "YOUR_GOTIFY_KEY", "internalId": 1 },
    { "key": "ANOTHER_GOTIFY_KEY", "internalId": 2 }
  ],
  "intervalInSeconds": 300,
  "apps": [
    { "appname": "your-app", "msgs2keep": 3, "gotify_key": 1 },
    { "appname": "another-app", "msgs2keep": 5, "gotify_key": 2 }
  ]
}
```

- `base_url`: URL of your Gotify server
- `gotify_keys`: List of API keys with unique internal IDs (you need 1 per user)
- `intervalInSeconds`: How often the cleanup runs
- `apps`: List of apps to clean up, with how many messages to keep and which key to use

## Usage

### Standalone
Install dependencies and run:

```bash
npm install
node index.js
```

### Docker
Build and run the container:

with `docker-compose`:

```yaml
services:
  gotify-cleanup:
    image: sproove/gotify-cleanup:latest
    container_name: gotify-cleanup
    restart: unless-stopped
    volumes:
      - gotify_config:/app/config
volumes:
    gotify_config:
      name: gotify_config

```

or manually


```bash
./build_and_package.sh
# or manually:
docker build -t gotify-cleanup .
docker run -v $(pwd)/config_set:/app/config gotify-cleanup
```


## Notes
- The script will only copy the example config to `/app/config/config.json` if it does not exist yet.
- Edit your config on the host in `config_set/config.json` for persistent changes.
- The container includes `nano` for editing files inside the container if needed.

## License
MIT
