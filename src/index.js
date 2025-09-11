const client = require('./bot');
const { startRetryInterval } = require('./utils/channelManager');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN || require('../config.json').token;

// ---------------- Event listeners ----------------
client.on('voiceStateUpdate', require('./events/voiceStateUpdate'));
client.on('presenceUpdate', require('./events/presenceUpdate'));
client.on('channelUpdate', require('./events/channelUpdate'));

// ---------------- Bot ready ----------------
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Start retry interval for rate-limited channel renames
  startRetryInterval(client);

  // Start minimal express server for UptimeRobot pings
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => res.send('Bot is alive!'));
  app.listen(PORT, () => console.log(`HTTP server running on port ${PORT}`));
});

// ---------------- Login ----------------
client.login(token);
