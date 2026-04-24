export default {
    name: 'addplugin',
    alias: [],
    desc: 'addplugin command',
    category: 'owner',
    usage: 'addplugin',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command addplugin is active.' }, { quoted: msg });
    }
};
