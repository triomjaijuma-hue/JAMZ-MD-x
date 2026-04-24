import yts from 'yt-search';
import axios from 'axios';

export default {
    name: 'song',
    alias: ['audio'],
    desc: 'Download audio from YouTube',
    category: 'music',
    usage: 'song [query]',
    execute: async (sock, msg, { args, text }) => {
        const query = text || args.join(' ');
        if (!query) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a song name or YouTube link.' }, { quoted: msg });
        
        try {
            const search = await yts(query);
            const video = search.videos[0];
            
            if (!video) return sock.sendMessage(msg.key.remoteJid, { text: 'No results found.' }, { quoted: msg });
            
            await sock.sendMessage(msg.key.remoteJid, { text: `📥 Downloading *${video.title}*...` }, { quoted: msg });
            
            // Download using API
            console.log(`[SONG] Downloading audio for: ${video.url}`);
            const res = await axios.get(`https://api.maher-zubair.tech/download/ytmp3?url=${encodeURIComponent(video.url)}`);
            
            if (res.data && res.data.status === 200 && res.data.result && res.data.result.link) {
                const audioUrl = res.data.result.link;
                await sock.sendMessage(msg.key.remoteJid, { 
                    audio: { url: audioUrl }, 
                    mimetype: 'audio/mpeg',
                    fileName: `${video.title}.mp3`
                }, { quoted: msg });
            } else {
                console.error('[SONG] API Error:', res.data);
                throw new Error('Failed to get download link from API.');
            }
            
        } catch (e) {
            console.error('[SONG] Command Error:', e);
            await sock.sendMessage(msg.key.remoteJid, { text: 'Error: ' + e.message }, { quoted: msg });
        }
    }
};
