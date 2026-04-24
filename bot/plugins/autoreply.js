export default {
    name: 'autoreply',
    alias: [],
    desc: 'autoreply command',
    category: 'owner',
    usage: 'autoreply',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command autoreply is active.' }, { quoted: msg });
    }
};
