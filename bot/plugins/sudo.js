export default {
    name: 'sudo',
    alias: [],
    desc: 'sudo command',
    category: 'owner',
    usage: 'sudo',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command sudo is active.' }, { quoted: msg });
    }
};
