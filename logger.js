const colors = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function timestamp() {
  return `${colors.gray}[${new Date().toISOString()}]${colors.reset}`;
}

function log(msg, ...args) {
  console.log(`${timestamp()} ${msg}`, ...args);
}

function info(msg, ...args) {
  console.log(`${timestamp()} ${colors.blue}[INFO]${colors.reset} ${msg}`, ...args);
}

function success(msg, ...args) {
  console.log(`${timestamp()} ${colors.green}[SUCCESS]${colors.reset} ${msg}`, ...args);
}

function warn(msg, ...args) {
  console.warn(`${timestamp()} ${colors.yellow}[WARN]${colors.reset} ${msg}`, ...args);
}

function error(msg, ...args) {
  console.error(`${timestamp()} ${colors.red}[ERROR]${colors.reset} ${msg}`, ...args);
}

module.exports = { log, info, success, warn, error };