const { ChannelType } = require('discord.js');
const originalNames = new Map();
const retryAfter = new Map();
const idleNames = process.env.IDLE_NAMES ? process.env.IDLE_NAMES.split(",").map(name => name.trim()) : ["Vibin"];

// ---------------- Helpers ----------------
async function safeSetName(channel, name) {
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    if (channel.name === name) return;

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

function getRandomIdleName() {
    return idleNames[Math.floor(Math.random() * idleNames.length)];
}

// ---------------- Main function ----------------
async function updateChannelName(channel) {
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    // Save original name
    if (!originalNames.has(channel.id)) {
        originalNames.set(channel.id, channel.name);
    }

    // Empty channel then random idle name
    if (channel.members.size === 0) {
        await safeSetName(channel, getRandomIdleName());
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

    // Nobody playing then random idle name
    if (Object.keys(gameCounts).length === 0) {
        await safeSetName(channel, getRandomIdleName());
        return;
    }

    // Find dominant game
    const sortedGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]);
    const [topGame, topCount] = sortedGames[0];

    // Check if tie
    const tiedGames = sortedGames.filter(([_, count]) => count === topCount).map(([game]) => game);

    if (tiedGames.length > 1) {
        // Pick random game from tied games
        const randomGame = tiedGames[Math.floor(Math.random() * tiedGames.length)];
        const newName = randomGame.length > 90 ? randomGame.slice(0, 90) : randomGame;
        await safeSetName(channel, newName);
    } else {
        // Clear winner
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

// ---------------- Polling ----------------
function startPolling(client, interval = 5000) {
    setInterval(() => {
        client.guilds.cache.forEach(guild => {
            guild.channels.cache
                .filter(c => c.type === ChannelType.GuildVoice)
                .forEach(channel => {
                    updateChannelName(channel);
                });
        });
    }, interval);
}

// ---------------- Exports ----------------
module.exports = {
    updateChannelName,
    setOriginalName,
    startRetryInterval,
    startPolling
};
