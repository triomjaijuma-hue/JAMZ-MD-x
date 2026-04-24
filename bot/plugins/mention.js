export default {
    name: 'mention',
    alias: [],
    desc: 'mention command',
    category: 'owner',
    usage: 'mention',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command mention is active.' }, { quoted: msg });
    }
};
