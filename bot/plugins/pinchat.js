export default {
    name: 'pinchat',
    alias: [],
    desc: 'pinchat command',
    category: 'owner',
    usage: 'pinchat',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command pinchat is active.' }, { quoted: msg });
    }
};
