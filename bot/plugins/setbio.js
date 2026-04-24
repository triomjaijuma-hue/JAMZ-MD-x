export default {
    name: 'setbio',
    alias: [],
    desc: 'setbio command',
    category: 'owner',
    usage: 'setbio',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command setbio is active.' }, { quoted: msg });
    }
};
