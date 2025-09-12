const { ChannelType } = require('discord.js');
const originalNames = new Map();
const retryAfter = new Map();
const lastAppliedNames = new Map();
const idleNames = process.env.IDLE_NAMES ? process.env.IDLE_NAMES.split(",").map(name => name.trim()) : ["Vibin"];

// ---------------- Helpers ----------------
async function safeSetName(channel, name) {
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    if (channel.name === name) return;

    try {
        await channel.setName(name);
        lastAppliedNames.set(channel.id, name);
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

function getRandomIdleName(channelId) {
    let newName;
    do {
        newName = idleNames[Math.floor(Math.random() * idleNames.length)];
    } while (lastAppliedNames.get(channelId) === newName && idleNames.length > 1);
    return newName;
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
        const newName = getRandomIdleName(channel.id);
        if (lastAppliedNames.get(channel.id) !== newName) {
            await safeSetName(channel, newName);
        }
        return;
    }

    // Count games
    const gameCounts = {};
    channel.members.forEach(member => {
        const activity = member.presence?.activities.find(a => a.type === 0);
        if (activity) {
            gameCounts[activity.name] = (gameCounts[activity.name] || 0) + 1;
        }
    });

    // Nobody playing then random idle name
    if (Object.keys(gameCounts).length === 0) {
        const newName = getRandomIdleName(channel.id);
        if (lastAppliedNames.get(channel.id) !== newName) {
            await safeSetName(channel, newName);
        }
        return;
    }

    // Find dominant game
    const sortedGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]);
    const [topGame, topCount] = sortedGames[0];

    const tiedGames = sortedGames.filter(([_, count]) => count === topCount).map(([game]) => game);
    const chosenGame = tiedGames.length > 1
        ? tiedGames[Math.floor(Math.random() * tiedGames.length)]
        : topGame;

    const finalName = chosenGame.length > 90 ? chosenGame.slice(0, 90) : chosenGame;

    if (lastAppliedNames.get(channel.id) !== finalName) {
        await safeSetName(channel, finalName);
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
