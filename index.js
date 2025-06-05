const axios = require("axios");
const fs = require("fs");
const path = require("path");

// === Load configuration ===
const configPath = path.join(__dirname, "config", "config.json");

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const BASE_URL = config.base_url;
const gotifyKeys = config.gotify_keys;
const apps = config.apps;

// === Helper function: Get key for app ===
function getGotifyKeyForApp(app) {
  const keyObj = gotifyKeys.find((k) => k.internalId === app.gotify_key);
  if (!keyObj)
    throw new Error(`No Gotify key found for app "${app.appname}"!`);
  return keyObj.key;
}

// === Main function ===
async function main() {
  try {
    // 1. Collect all apps and messages
    let allApiApps = [];
    let allMessages = [];
    const seenAppIds = new Set();
    const seenMsgIds = new Set();

    for (const app of apps) {
      const appKey = getGotifyKeyForApp(app);
      const api = axios.create({
        baseURL: BASE_URL,
        headers: { "X-Gotify-Key": appKey },
      });
      // Fetch apps
      const { data: apiApps } = await api.get("/application");
      for (const apiApp of apiApps) {
        if (!seenAppIds.has(apiApp.id)) {
          allApiApps.push(apiApp);
          seenAppIds.add(apiApp.id);
        }
      }
      // Fetch messages
      const { data: messagesData } = await api.get("/message");
      for (const msg of messagesData.messages) {
        if (!seenMsgIds.has(msg.id)) {
          allMessages.push(msg);
          seenMsgIds.add(msg.id);
        }
      }
    }

    // 2. Link apps with ID
    apps.forEach((app) => {
      const match = allApiApps.find((apiApp) => apiApp.name === app.appname);
      if (match) {
        app.id = match.id;
      }
    });

    // 3. Assign messages to apps
    apps.forEach((app) => {
      if (!app.id) return;
      const messages = allMessages
        .filter((msg) => msg.appid === app.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // descending by date
      app.messages = messages;
    });

    // 4. Delete old messages (use the correct key per app)
    for (const app of apps) {
      if (!app.messages) continue;
      const appKey = getGotifyKeyForApp(app);
      const appApi = axios.create({
        baseURL: BASE_URL,
        headers: { "X-Gotify-Key": appKey },
      });
      const messagesToDelete = app.messages.slice(app.msgs2keep);
      for (const msg of messagesToDelete) {
        try {
          await appApi.delete(`/message/${msg.id}`);
          console.log(`Deleted message ${msg.id} for app "${app.appname}"`);
        } catch (err) {
          console.error(
            `Failed to delete message ${msg.id}:`,
            err.response?.data || err.message
          );
        }
      }
    }
  } catch (err) {
    console.error(
      "Error during processing:",
      err.response?.data || err.message
    );
  }
}

// === Start and set interval for continuous execution ===
main();
setInterval(() => {
  main();
}, 1000 * config.intervalInSeconds);
