export default {
    name: 'cmdreact',
    alias: [],
    desc: 'cmdreact command',
    category: 'owner',
    usage: 'cmdreact',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command cmdreact is active.' }, { quoted: msg });
    }
};
