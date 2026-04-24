export default {
    name: 'clear',
    alias: [],
    desc: 'clear command',
    category: 'owner',
    usage: 'clear',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command clear is active.' }, { quoted: msg });
    }
};
