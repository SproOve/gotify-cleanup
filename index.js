const axios = require("axios");
const fs = require("fs");
const path = require("path");
const logger = require("./logger"); // Added logger module

// === Load configuration ===
const configPath = path.join(__dirname, "config", "config.json");

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const BASE_URL = config.base_url;
const gotifyKeys = config.gotify_keys;
const apps = config.apps;

// === Helper function: Get key for app ===
function getGotifyKeyForApp(app) {
  const keyObj = gotifyKeys.find((k) => k.internalId === app.gotify_key);
  if (!keyObj) throw new Error(`No Gotify key found for app "${app.appname}"!`);
  return keyObj.key;
}

// === Main function ===
async function main() {
  try {
    logger.info("Starting Gotify cleanup process...");
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
      logger.info(`Fetching apps and messages for "${app.appname}"...`);
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
        logger.success(`Linked app "${app.appname}" with ID ${app.id}`);
      } else {
        logger.warn(`No API app found for "${app.appname}"`);
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
      let messagesToDelete = [];
      if (!app.mode) {
        logger.info(
          `No mode set for app "${app.appname}", setting mode to default value 'keep amount'.`
        );
        app.mode = "keep_amount"; // Default mode if not set
      }
      if (app.mode === "keep_amount") {
        messagesToDelete = app.messages.slice(app.msgs2keep);
      } else if (app.mode === "keep_unique") {
        logger.warn(
          `Mode 'keep_unique' is bugged like hell! Wait for an update pls.`
        );
        // const uniqueMessages = new Map();
        // for (const msg of app.messages) {
        //   if (!uniqueMessages.has(msg.message)) {
        //     uniqueMessages.set(msg.message, msg);
        //   }
        // }
        // messagesToDelete = app.messages.filter(
        //   (msg) => !uniqueMessages.has(msg.message)
        // );
      } else if (app.mode === "delete_filtered") {
        messagesToDelete = app.messages.filter((msg) => {
          return app.substrings.some((filter) =>
            msg.message.toLowerCase().includes(filter.toLowerCase())
          );
        });
      } else if (app.mode === "keep_filtered") {
        messagesToDelete = app.messages.filter((msg) => {
          return !app.substrings.some((filter) =>
            msg.message.toLowerCase().includes(filter.toLowerCase())
          );
        });
      } else if (app.mode === "uptime-kuma") {
        // Uptime-Kuma Speziallogik
        let remainingMessages = [...app.messages];
        while (remainingMessages.length > 0) {
          const firstMsg = remainingMessages[0];
          // Titel extrahieren: zwischen erstem '[' und erstem ']'
          const match = firstMsg.message.match(/\[([^\]]+)\]/);
          if (!match) {
            // Kein Titel gefunden, entferne und überspringe
            remainingMessages.shift();
            continue;
          }
          const title = match[1];

          // Alle Messages mit gleichem Titel suchen
          const related = remainingMessages.filter((msg) => {
            const m = msg.message.match(/\[([^\]]+)\]/);
            return m && m[1] === title;
          });

          // Down- und Up-Messages trennen
          const downs = related.filter((msg) =>
            msg.message.toLowerCase().includes("down")
          );
          const ups = related.filter((msg) =>
            msg.message.toLowerCase().includes("up")
          );

          // Valuepairs bilden: immer ein "down" + ein "up" (chronologisch sortiert)
          downs.sort((a, b) => new Date(a.date) - new Date(b.date));
          ups.sort((a, b) => new Date(a.date) - new Date(b.date));

          const pairCount = Math.min(downs.length, ups.length);
          const keepPairs = Math.max(0, app.msgs2keep);

          // Zu löschende Valuepairs bestimmen (alle über msgs2keep hinaus)
          const deleteDowns = downs.slice(
            0,
            Math.max(0, downs.length - keepPairs)
          );
          const deleteUps = ups.slice(0, Math.max(0, ups.length - keepPairs));

          // Wenn mehr downs als ups, bleibt der einzelne down stehen
          // (also nur Valuepairs löschen, einzelne downs bleiben)
          messagesToDelete.push(...deleteDowns, ...deleteUps);

          // Entferne alle bearbeiteten Messages aus remainingMessages
          const handledIds = new Set([...related].map((m) => m.id));
          remainingMessages = remainingMessages.filter(
            (msg) => !handledIds.has(msg.id)
          );
        }
        logger.info(
          `App "${app.appname}" has ${messages.length} messages (attempting to delete ${messagesToDelete.length} messages)`
        );
      }
      for (const msg of messagesToDelete) {
        try {
          await appApi.delete(`/message/${msg.id}`);
          logger.success(`Deleted message ${msg.id} for app "${app.appname}"`);
        } catch (err) {
          logger.error(
            `Failed to delete message ${msg.id} for app "${app.appname}": ${
              err.response?.data || err.message
            }`
          );
        }
      }
      if (messagesToDelete.length > 0) {
        logger.info(
          `Deleted ${messagesToDelete.length} messages for app "${app.appname}"`
        );
      } else {
        logger.info(`No messages to delete for app "${app.appname}"`);
      }
    }
    logger.success("Gotify cleanup process finished.");
  } catch (err) {
    logger.error("Error during processing:", err.response?.data || err.message);
  }
}

// === Start and set interval for continuous execution ===
main();
setInterval(() => {
  main();
}, 1000 * config.intervalInSeconds);
