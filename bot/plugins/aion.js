export default {
    name: 'aion',
    alias: [],
    desc: 'aion command',
    category: 'owner',
    usage: 'aion',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command aion is active.' }, { quoted: msg });
    }
};
