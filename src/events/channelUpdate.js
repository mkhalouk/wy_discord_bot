const { setOriginalName } = require('../utils/channelManager');

module.exports = (oldChannel, newChannel) => {
  if (oldChannel.type === 2 && oldChannel.name !== newChannel.name) {
    setOriginalName(newChannel.id, newChannel.name);
  }
};
