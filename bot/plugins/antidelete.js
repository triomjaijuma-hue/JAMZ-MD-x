export default {
    name: 'antidelete',
    alias: [],
    desc: 'antidelete command',
    category: 'owner',
    usage: 'antidelete',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command antidelete is active.' }, { quoted: msg });
    }
};
