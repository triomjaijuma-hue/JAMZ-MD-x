export default {
    name: 'maintenance',
    alias: [],
    desc: 'maintenance command',
    category: 'owner',
    usage: 'maintenance',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command maintenance is active.' }, { quoted: msg });
    }
};
