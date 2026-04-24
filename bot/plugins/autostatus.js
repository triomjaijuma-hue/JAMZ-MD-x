export default {
    name: 'autostatus',
    alias: [],
    desc: 'autostatus command',
    category: 'owner',
    usage: 'autostatus',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command autostatus is active.' }, { quoted: msg });
    }
};
