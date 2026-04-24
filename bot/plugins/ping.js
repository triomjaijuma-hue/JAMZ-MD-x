export default {
    name: 'ping',
    alias: ['p'],
    desc: 'Check bot response speed.',
    category: 'general',
    usage: 'ping',
    execute: async (sock, msg) => {
        const start = Date.now();
        const { key } = await sock.sendMessage(msg.key.remoteJid, { text: 'Pinging...' }, { quoted: msg });
        const end = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: `*Pong!* 🫠\n\n*Response:* ${end - start}ms`, edit: key }, { quoted: msg });
    }
};
