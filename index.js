const axios = require("axios");
const fs = require("fs");
const path = require("path");

// === Konfiguration laden ===
const configPath = path.join(__dirname, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const BASE_URL = config.base_url;
const gotifyKeys = config.gotify_keys;
const apps = config.apps;

// === Hilfsfunktion: Key für App holen ===
function getGotifyKeyForApp(app) {
  const keyObj = gotifyKeys.find(k => k.internalId === app.gotify_key);
  if (!keyObj) throw new Error(`Kein Gotify-Key für App "${app.appname}" gefunden!`);
  return keyObj.key;
}

// === Hauptfunktion ===
async function main() {
  try {
    // 1. Apps von API abrufen (nutze den Key der ersten App für die Initialabfrage)
    const firstKey = getGotifyKeyForApp(apps[0]);
    const api = axios.create({
      baseURL: BASE_URL,
      headers: { "X-Gotify-Key": firstKey },
    });
    const { data: apiApps } = await api.get("/application");

    // 2. Apps mit ID verknüpfen
    apps.forEach((app) => {
      const match = apiApps.find((apiApp) => apiApp.name === app.appname);
      if (match) {
        app.id = match.id;
      }
    });

    // 3. Messages abrufen (nutze wieder den Key der ersten App)
    const { data: allMessages } = await api.get("/message");

    // 4. Messages den Apps zuordnen
    apps.forEach((app) => {
      if (!app.id) return;
      const messages = allMessages.messages
        .filter((msg) => msg.appid === app.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // nach Datum absteigend

      app.messages = messages;
    });

    // 5. Alte Messages löschen (hier pro App den richtigen Key nutzen)
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
      "Fehler bei der Verarbeitung:",
      err.response?.data || err.message
    );
  }
}

main();
