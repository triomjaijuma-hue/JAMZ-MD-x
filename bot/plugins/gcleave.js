export default {
    name: 'gcleave',
    alias: [],
    desc: 'gcleave command',
    category: 'owner',
    usage: 'gcleave',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command gcleave is active.' }, { quoted: msg });
    }
};
