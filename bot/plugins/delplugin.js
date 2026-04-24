export default {
    name: 'delplugin',
    alias: [],
    desc: 'delplugin command',
    category: 'owner',
    usage: 'delplugin',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command delplugin is active.' }, { quoted: msg });
    }
};
