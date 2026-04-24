export default {
    name: 'stoprent',
    alias: [],
    desc: 'stoprent command',
    category: 'owner',
    usage: 'stoprent',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command stoprent is active.' }, { quoted: msg });
    }
};
