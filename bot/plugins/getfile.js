export default {
    name: 'getfile',
    alias: [],
    desc: 'getfile command',
    category: 'owner',
    usage: 'getfile',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command getfile is active.' }, { quoted: msg });
    }
};
