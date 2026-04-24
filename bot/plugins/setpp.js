export default {
    name: 'setpp',
    alias: [],
    desc: 'setpp command',
    category: 'owner',
    usage: 'setpp',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command setpp is active.' }, { quoted: msg });
    }
};
