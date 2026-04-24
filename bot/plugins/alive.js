export default {
    name: 'alive',
    alias: ['runtime', 'status'],
    desc: 'Check if the bot is active.',
    category: 'general',
    usage: 'alive',
    execute: async (sock, msg, { prefix }) => {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const message = `*JAMZ-MD v6.0.0 is Alive!* 🫠\n\n*Uptime:* ${hours}h ${minutes}m ${seconds}s\n*Prefix:* ${prefix}\n*Owner:* 256706106326`;
        
        await sock.sendMessage(msg.key.remoteJid, { 
            text: message,
            contextInfo: {
                externalAdReply: {
                    title: 'JAMZ-MD v6.0.0',
                    body: 'Active and Ready',
                    mediaType: 1,
                    thumbnailUrl: 'https://github.com/jumaxjaitom-x.png',
                    sourceUrl: 'https://github.com/jumaxjaitom-x/JAMZ-MD-'
                }
            }
        }, { quoted: msg });
    }
};
