const { updateChannelName } = require('../utils/channelManager');

module.exports = (oldState, newState) => {
  if (oldState.channel) updateChannelName(oldState.channel);
  if (newState.channel) updateChannelName(newState.channel);
};
