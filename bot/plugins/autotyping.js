export default {
    name: 'autotyping',
    alias: [],
    desc: 'autotyping command',
    category: 'owner',
    usage: 'autotyping',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command autotyping is active.' }, { quoted: msg });
    }
};
