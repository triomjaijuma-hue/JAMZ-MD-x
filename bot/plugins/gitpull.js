export default {
    name: 'gitpull',
    alias: [],
    desc: 'gitpull command',
    category: 'owner',
    usage: 'gitpull',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command gitpull is active.' }, { quoted: msg });
    }
};
