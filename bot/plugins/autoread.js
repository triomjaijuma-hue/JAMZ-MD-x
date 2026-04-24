export default {
    name: 'autoread',
    alias: [],
    desc: 'autoread command',
    category: 'owner',
    usage: 'autoread',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command autoread is active.' }, { quoted: msg });
    }
};
