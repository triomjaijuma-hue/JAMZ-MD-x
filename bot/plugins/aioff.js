export default {
    name: 'aioff',
    alias: [],
    desc: 'aioff command',
    category: 'owner',
    usage: 'aioff',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command aioff is active.' }, { quoted: msg });
    }
};
