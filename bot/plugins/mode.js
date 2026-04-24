export default {
    name: 'mode',
    alias: [],
    desc: 'mode command',
    category: 'owner',
    usage: 'mode',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command mode is active.' }, { quoted: msg });
    }
};
