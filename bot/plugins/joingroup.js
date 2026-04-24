export default {
    name: 'joingroup',
    alias: [],
    desc: 'joingroup command',
    category: 'owner',
    usage: 'joingroup',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command joingroup is active.' }, { quoted: msg });
    }
};
