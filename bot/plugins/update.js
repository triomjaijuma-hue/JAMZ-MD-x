export default {
    name: 'update',
    alias: [],
    desc: 'update command',
    category: 'owner',
    usage: 'update',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command update is active.' }, { quoted: msg });
    }
};
