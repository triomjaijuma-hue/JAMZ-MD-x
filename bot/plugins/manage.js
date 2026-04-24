export default {
    name: 'manage',
    alias: [],
    desc: 'manage command',
    category: 'owner',
    usage: 'manage',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command manage is active.' }, { quoted: msg });
    }
};
