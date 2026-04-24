export default {
    name: 'pmblocker',
    alias: [],
    desc: 'pmblocker command',
    category: 'owner',
    usage: 'pmblocker',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command pmblocker is active.' }, { quoted: msg });
    }
};
