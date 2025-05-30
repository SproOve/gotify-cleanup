# My TypeScript App

## Overview
This project is a TypeScript application that reads configuration settings from a JSON file and initializes the application accordingly. It is designed to be containerized using Docker for easy deployment and management.

## Project Structure
```
my-typescript-app
├── src
│   ├── app.ts          # Main entry point of the application
│   └── types
│       └── index.ts    # Type definitions and interfaces
├── config
│   └── config.json     # Main configuration file
├── config_set
│   └── config.json     # Duplicate configuration for installation
├── .gitignore           # Files and directories to ignore in Git
├── Dockerfile           # Instructions to build the Docker image
├── docker-compose.yml   # Configuration for Docker services and volumes
├── deploy.sh            # Script to automate deployment
├── package.json         # npm configuration file
├── tsconfig.json        # TypeScript configuration file
└── README.md            # Project documentation
```

## Setup Instructions
1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd my-typescript-app
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Build the Docker image:**
   ```
   docker build -t my-typescript-app .
   ```

4. **Run the application using Docker Compose:**
   ```
   docker-compose up
   ```

## Usage
- The application reads the configuration from `config/config.json`. Ensure that this file contains the necessary `key` and `base-url` for the application to function correctly.
- The `config_set/config.json` file is used during the installation process to replace the configuration in the Docker container.

## Deployment
To deploy the application, run the `deploy.sh` script. This script will:
- Build the Docker image.
- Remove any existing zip file of the application.
- Create a new zip file containing the application files.

## Contributing
Feel free to submit issues or pull requests for improvements or bug fixes. Please ensure that your contributions adhere to the project's coding standards and guidelines.