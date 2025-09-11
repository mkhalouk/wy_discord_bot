const { updateChannelName } = require('../utils/channelManager');

module.exports = (oldPresence, newPresence) => {
  const channel = newPresence.member?.voice.channel;
  if (channel) updateChannelName(channel);
};
