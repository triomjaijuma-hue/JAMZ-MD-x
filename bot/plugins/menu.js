export default {
    name: 'menu',
    alias: ['help', 'list'],
    desc: 'Show all available commands.',
    category: 'general',
    usage: 'menu',
    execute: async (sock, msg, { prefix, plugins }) => {
        const categories = {};
        
        plugins.forEach(plugin => {
            const cat = plugin.category || 'misc';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(plugin.name);
        });

        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${days > 0 ? days + 'd ' : ''}${hours}h ${minutes}m ${seconds}s`;

        const pushname = msg.pushName || 'User';

        let menuText = `╭━━━〔 *JAMZ-MD v6.0.0* 〕━━━┈⊷\n`;
        menuText += `┃ 👤 *User:* ${pushname}\n`;
        menuText += `┃ 🕒 *Uptime:* ${uptimeStr}\n`;
        menuText += `┃ ⌨️ *Prefix:* ${prefix}\n`;
        menuText += `┃ 📦 *Commands:* ${plugins.size}\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━┈⊷\n\n`;

        const sortedCategories = Object.keys(categories).sort();

        for (const cat of sortedCategories) {
            const cmds = categories[cat];
            menuText += `╭━━━〔 *${cat.toUpperCase()}* 〕━━━┈⊷\n`;
            cmds.sort().forEach(cmd => {
                menuText += `┃ ▢ ${prefix}${cmd}\n`;
            });
            menuText += `╰━━━━━━━━━━━━━━━━━━━━┈⊷\n\n`;
        }

        menuText += `*JAMZ-MD v6.0.0* - Simple & Powerful 🫠`;

        await sock.sendMessage(msg.key.remoteJid, { 
            text: menuText,
            contextInfo: {
                externalAdReply: {
                    title: 'JAMZ-MD v6.0.0 MENU',
                    body: 'A Powerful WhatsApp Bot',
                    mediaType: 1,
                    thumbnailUrl: 'https://github.com/jumaxjaitom-x.png',
                    sourceUrl: 'https://github.com/jumaxjaitom-x/JAMZ-MD-',
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            }
        }, { quoted: msg });
    }
};
