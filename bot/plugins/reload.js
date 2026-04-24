export default {
    name: 'reload',
    alias: [],
    desc: 'reload command',
    category: 'owner',
    usage: 'reload',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command reload is active.' }, { quoted: msg });
    }
};
