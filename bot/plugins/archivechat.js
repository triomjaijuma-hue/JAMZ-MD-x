export default {
    name: 'archivechat',
    alias: [],
    desc: 'archivechat command',
    category: 'owner',
    usage: 'archivechat',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command archivechat is active.' }, { quoted: msg });
    }
};
