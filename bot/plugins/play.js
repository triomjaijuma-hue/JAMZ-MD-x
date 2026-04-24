import yts from 'yt-search';
import axios from 'axios';

export default {
    name: 'play',
    alias: ['music'],
    desc: 'Search and play audio from YouTube',
    category: 'music',
    usage: 'play [query]',
    execute: async (sock, msg, { args, text }) => {
        const query = text || args.join(' ');
        if (!query) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a song name or YouTube link.' }, { quoted: msg });
        
        try {
            await sock.sendMessage(msg.key.remoteJid, { text: `🔍 Searching for: *${query}*...` }, { quoted: msg });
            
            const search = await yts(query);
            const video = search.videos[0];
            
            if (!video) return sock.sendMessage(msg.key.remoteJid, { text: 'No results found.' }, { quoted: msg });
            
            const infoText = `🎵 *JAMZ-MD PLAYER*\n\n*Title:* ${video.title}\n*Duration:* ${video.timestamp}\n*Views:* ${video.views}\n*Uploaded:* ${video.ago}\n*Link:* ${video.url}\n\n_Downloading audio..._`;
            
            await sock.sendMessage(msg.key.remoteJid, { 
                image: { url: video.thumbnail }, 
                caption: infoText 
            }, { quoted: msg });
            
            // Download using API
            console.log(`[PLAY] Downloading audio for: ${video.url}`);
            const res = await axios.get(`https://api.maher-zubair.tech/download/ytmp3?url=${encodeURIComponent(video.url)}`);
            
            if (res.data && res.data.status === 200 && res.data.result && res.data.result.link) {
                const audioUrl = res.data.result.link;
                await sock.sendMessage(msg.key.remoteJid, { 
                    audio: { url: audioUrl }, 
                    mimetype: 'audio/mpeg',
                    fileName: `${video.title}.mp3`
                }, { quoted: msg });
            } else {
                console.error('[PLAY] API Error:', res.data);
                throw new Error('Failed to get download link from API. Status: ' + (res.data?.status || 'unknown'));
            }
            
        } catch (e) {
            console.error('[PLAY] Command Error:', e);
            await sock.sendMessage(msg.key.remoteJid, { text: 'Error: ' + e.message }, { quoted: msg });
        }
    }
};
