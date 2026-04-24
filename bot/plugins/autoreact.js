export default {
    name: 'autoreact',
    alias: [],
    desc: 'autoreact command',
    category: 'owner',
    usage: 'autoreact',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command autoreact is active.' }, { quoted: msg });
    }
};
