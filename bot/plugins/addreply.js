export default {
    name: 'addreply',
    alias: [],
    desc: 'addreply command',
    category: 'owner',
    usage: 'addreply',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command addreply is active.' }, { quoted: msg });
    }
};
