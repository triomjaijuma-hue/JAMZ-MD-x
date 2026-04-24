export default {
    name: 'echo',
    alias: ['repeat'],
    desc: 'Repeat the given text.',
    category: 'general',
    usage: 'echo [text]',
    execute: async (sock, msg, { text }) => {
        if (!text) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide text to echo.' }, { quoted: msg });
        await sock.sendMessage(msg.key.remoteJid, { text: text }, { quoted: msg });
    }
};
