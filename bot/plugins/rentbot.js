export default {
    name: 'rentbot',
    alias: [],
    desc: 'rentbot command',
    category: 'owner',
    usage: 'rentbot',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command rentbot is active.' }, { quoted: msg });
    }
};
