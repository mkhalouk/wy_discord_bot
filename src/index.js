const client = require('./bot');
const config = require('../config.json');

client.on('voiceStateUpdate', require('./events/voiceStateUpdate'));
client.on('presenceUpdate', require('./events/presenceUpdate'));
client.on('channelUpdate', require('./events/channelUpdate'));

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(config.token);
