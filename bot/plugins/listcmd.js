export default {
    name: 'listcmd',
    alias: [],
    desc: 'listcmd command',
    category: 'owner',
    usage: 'listcmd',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: 'Command listcmd is active.' }, { quoted: msg });
    }
};
