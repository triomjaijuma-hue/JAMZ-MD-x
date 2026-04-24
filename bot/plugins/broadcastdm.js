export default {
    name: 'broadcastdm',
    alias: [],
    desc: 'broadcastdm command',
    category: 'owner',
    usage: 'broadcastdm',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command broadcastdm is active.' }, { quoted: msg });
    }
};
