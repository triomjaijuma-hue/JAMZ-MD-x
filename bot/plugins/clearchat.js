export default {
    name: 'clearchat',
    alias: [],
    desc: 'clearchat command',
    category: 'owner',
    usage: 'clearchat',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command clearchat is active.' }, { quoted: msg });
    }
};
