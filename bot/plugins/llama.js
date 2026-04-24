import axios from 'axios';

export default {
    name: 'llama',
    alias: [],
    desc: 'llama AI command',
    category: 'ai',
    usage: 'llama [query]',
    execute: async (sock, msg, { args }) => {
        const text = args.join(' ');
        if (!text) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a query.' }, { quoted: msg });
        
        await sock.sendMessage(msg.key.remoteJid, { text: 'AI feature llama is processing...' }, { quoted: msg });
        // Simulating AI response for now to ensure free tier compatibility
        try {
            const res = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(text)}&lc=en`);
            await sock.sendMessage(msg.key.remoteJid, { text: res.data.success || 'AI is busy right now.' }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'AI service unavailable.' }, { quoted: msg });
        }
    }
};
