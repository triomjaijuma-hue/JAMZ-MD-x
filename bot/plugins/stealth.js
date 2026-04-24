export default {
    name: 'stealth',
    alias: [],
    desc: 'stealth command',
    category: 'owner',
    usage: 'stealth',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command stealth is active.' }, { quoted: msg });
    }
};
