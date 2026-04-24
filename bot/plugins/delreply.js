export default {
    name: 'delreply',
    alias: [],
    desc: 'delreply command',
    category: 'owner',
    usage: 'delreply',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command delreply is active.' }, { quoted: msg });
    }
};
