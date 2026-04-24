export default {
    name: 'gitinfo',
    alias: [],
    desc: 'gitinfo command',
    category: 'owner',
    usage: 'gitinfo',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command gitinfo is active.' }, { quoted: msg });
    }
};
