// Map to store original channel names
const originalNames = new Map();

async function updateChannelName(channel) {
  if (!channel || channel.type !== 2) return; // Only voice channels

  // Remember original name
  if (!originalNames.has(channel.id)) {
    originalNames.set(channel.id, channel.name);
  }
  const baseName = originalNames.get(channel.id);

  // Empty channel then reset
  if (channel.members.size === 0) {
    if (channel.name !== baseName) await channel.setName(baseName);
    return;
  }

  // Count games
  const gameCounts = {};
  channel.members.forEach(member => {
    const activity = member.presence?.activities.find(a => a.type === 0); // type 0 = Playing
    if (activity) {
      gameCounts[activity.name] = (gameCounts[activity.name] || 0) + 1;
    }
  });

  // Nobody playing then reset
  if (Object.keys(gameCounts).length === 0) {
    if (channel.name !== baseName) await channel.setName(baseName);
    return;
  }

  // Find dominant game
  const sortedGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]);
  const [topGame, topCount] = sortedGames[0];
  const isTie = sortedGames.filter(([_, count]) => count === topCount).length > 1;

  if (isTie) {
    if (channel.name !== baseName) await channel.setName(baseName);
  } else {
    if (channel.name !== topGame) {
      const newName = topGame.length > 90 ? topGame.slice(0, 90) : topGame;
      await channel.setName(newName);
    }
  }
}

function setOriginalName(channelId, name) {
  originalNames.set(channelId, name);
}

module.exports = { updateChannelName, setOriginalName };
