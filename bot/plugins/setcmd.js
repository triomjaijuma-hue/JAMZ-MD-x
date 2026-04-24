export default {
    name: 'setcmd',
    alias: [],
    desc: 'setcmd command',
    category: 'owner',
    usage: 'setcmd',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command setcmd is active.' }, { quoted: msg });
    }
};
