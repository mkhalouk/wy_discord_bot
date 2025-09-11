const client = require('./bot');
const { startRetryInterval } = require('./utils/channelManager');

const token = process.env.DISCORD_TOKEN || require('../config.json').token;

// Event listeners
client.on('voiceStateUpdate', require('./events/voiceStateUpdate'));
client.on('presenceUpdate', require('./events/presenceUpdate'));
client.on('channelUpdate', require('./events/channelUpdate'));

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  startRetryInterval(client);
});

client.login(token);
