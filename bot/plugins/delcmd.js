export default {
    name: 'delcmd',
    alias: [],
    desc: 'delcmd command',
    category: 'owner',
    usage: 'delcmd',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command delcmd is active.' }, { quoted: msg });
    }
};
