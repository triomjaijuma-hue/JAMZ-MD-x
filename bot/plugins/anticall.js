export default {
    name: 'anticall',
    alias: [],
    desc: 'anticall command',
    category: 'owner',
    usage: 'anticall',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command anticall is active.' }, { quoted: msg });
    }
};
