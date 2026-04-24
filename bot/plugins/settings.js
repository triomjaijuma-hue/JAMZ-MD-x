export default {
    name: 'settings',
    alias: [],
    desc: 'settings command',
    category: 'owner',
    usage: 'settings',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command settings is active.' }, { quoted: msg });
    }
};
