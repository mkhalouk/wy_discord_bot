const { ChannelType } = require('discord.js');
const originalNames = new Map();
const retryAfter = new Map();

// ---------------- Helper ----------------
async function safeSetName(channel, name) {
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    if (channel.name === name) return; // Already correct

    try {
        await channel.setName(name);
    } catch (err) {
        if (err.code === 429) { // Rate limit
            console.warn(`Rate limit hit for channel ${channel.name}, will retry in 10 min`);
            retryAfter.set(channel.id, Date.now() + 10 * 60 * 1000);
        } else if (err.code === 50013) { // Missing permissions
            console.error(`Missing permissions to rename channel ${channel.name}`);
        } else {
            console.error(`Failed to rename channel ${channel.name}:`, err);
        }
    }
}

// ---------------- Main function ----------------
async function updateChannelName(channel) {
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    // Remember original name
    if (!originalNames.has(channel.id)) {
        originalNames.set(channel.id, channel.name);
    }
    const baseName = originalNames.get(channel.id);

    // Empty channel then reset
    if (channel.members.size === 0) {
        await safeSetName(channel, baseName);
        return;
    }

    // Count games
    const gameCounts = {};
    channel.members.forEach(member => {
        const activity = member.presence?.activities.find(a => a.type === 0); // Playing
        if (activity) {
            gameCounts[activity.name] = (gameCounts[activity.name] || 0) + 1;
        }
    });

    // Nobody playing -> "Vibin"
    if (Object.keys(gameCounts).length === 0) {
        await safeSetName(channel, "Vibin");
        return;
    }

    // Find dominant game
    const sortedGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]);
    const [topGame, topCount] = sortedGames[0];
    const isTie = sortedGames.filter(([_, count]) => count === topCount).length > 1;

    if (isTie) {
        await safeSetName(channel, baseName);
    } else {
        const newName = topGame.length > 90 ? topGame.slice(0, 90) : topGame;
        await safeSetName(channel, newName);
    }
}

// ---------------- Retry Interval ----------------
function startRetryInterval(client) {
    setInterval(() => {
        const now = Date.now();
        retryAfter.forEach((time, channelId) => {
            if (now >= time) {
                const channel = client.channels.cache.get(channelId);
                if (channel) {
                    console.log(`Retrying rename for channel ${channel.name}`);
                    updateChannelName(channel);
                }
                retryAfter.delete(channelId);
            }
        });
    }, 60 * 1000); // check every 1 min
}

// ---------------- Utility ----------------
function setOriginalName(channelId, name) {
    originalNames.set(channelId, name);
}

// ---------------- Exports ----------------
module.exports = {
    updateChannelName,
    setOriginalName,
    startRetryInterval
};
