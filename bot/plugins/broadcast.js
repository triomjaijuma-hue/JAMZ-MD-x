export default {
    name: 'broadcast',
    alias: [],
    desc: 'broadcast command',
    category: 'owner',
    usage: 'broadcast',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command broadcast is active.' }, { quoted: msg });
    }
};
