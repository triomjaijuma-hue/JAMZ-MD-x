export default {
    name: 'channelid',
    alias: ['cid'],
    desc: 'Get the ID of the current channel/group.',
    category: 'general',
    usage: 'channelid',
    execute: async (sock, msg) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `*Chat ID:* ${msg.key.remoteJid}` }, { quoted: msg });
    }
};
