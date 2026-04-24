export default {
    name: 'cleartmp',
    alias: [],
    desc: 'cleartmp command',
    category: 'owner',
    usage: 'cleartmp',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command cleartmp is active.' }, { quoted: msg });
    }
};
