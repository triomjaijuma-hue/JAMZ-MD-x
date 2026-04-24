export default {
    name: 'star',
    alias: [],
    desc: 'star command',
    category: 'owner',
    usage: 'star',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command star is active.' }, { quoted: msg });
    }
};
