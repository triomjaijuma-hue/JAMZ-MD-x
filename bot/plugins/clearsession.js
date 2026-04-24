export default {
    name: 'clearsession',
    alias: [],
    desc: 'clearsession command',
    category: 'owner',
    usage: 'clearsession',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command clearsession is active.' }, { quoted: msg });
    }
};
