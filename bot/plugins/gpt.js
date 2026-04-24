import axios from 'axios';
import OpenAI from 'openai';

export default {
    name: 'gpt',
    alias: ['ai', 'openai'],
    desc: 'Chat with GPT AI',
    category: 'ai',
    usage: 'gpt [query]',
    execute: async (sock, msg, { args, text }) => {
        const query = text || args.join(' ');
        if (!query) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a query.' }, { quoted: msg });
        
        console.log(`[GPT] Request from ${msg.key.remoteJid}: ${query}`);
        
        if (process.env.OPENAI_API_KEY) {
            try {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const response = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: query }],
                });
                const result = response.choices[0].message.content;
                console.log(`[GPT] OpenAI Success: ${result.slice(0, 50)}...`);
                return await sock.sendMessage(msg.key.remoteJid, { text: result }, { quoted: msg });
            } catch (e) {
                console.error('[GPT] OpenAI Error:', e.message);
            }
        }

        // Fallback to free API
        try {
            console.log(`[GPT] Attempting fallback API (Maher Zubair) for: ${query}`);
            const res = await axios.get(`https://api.maher-zubair.tech/ai/chatgptv4?q=${encodeURIComponent(query)}`);
            
            if (res.data && res.data.status === 200 && res.data.result) {
                console.log(`[GPT] Fallback Success: ${res.data.result.slice(0, 50)}...`);
                await sock.sendMessage(msg.key.remoteJid, { text: res.data.result }, { quoted: msg });
            } else {
                console.warn('[GPT] Fallback API returned non-200 status or empty result:', res.data);
                throw new Error('Invalid response from fallback API');
            }
        } catch (e) {
            console.error('[GPT] Fallback Error:', e.message);
            if (e.response) {
                console.error('[GPT] Fallback API Error Response Data:', e.response.data);
            }
            
            // Secondary fallback to SimSimi
            try {
                console.log('[GPT] Attempting secondary fallback (SimSimi)');
                const res = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(query)}&lc=en`);
                const simResponse = res.data.success || 'AI is busy right now.';
                await sock.sendMessage(msg.key.remoteJid, { text: simResponse }, { quoted: msg });
            } catch (e2) {
                console.error('[GPT] Secondary Fallback Error:', e2.message);
                await sock.sendMessage(msg.key.remoteJid, { text: 'AI service currently unavailable. Please try again later.' }, { quoted: msg });
            }
        }
    }
};
