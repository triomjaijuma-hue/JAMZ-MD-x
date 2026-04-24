export default {
    name: 'inspect',
    alias: [],
    desc: 'inspect command',
    category: 'owner',
    usage: 'inspect',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command inspect is active.' }, { quoted: msg });
    }
};
