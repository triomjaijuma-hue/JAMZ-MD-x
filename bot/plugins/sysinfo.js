export default {
    name: 'sysinfo',
    alias: [],
    desc: 'sysinfo command',
    category: 'owner',
    usage: 'sysinfo',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command sysinfo is active.' }, { quoted: msg });
    }
};
