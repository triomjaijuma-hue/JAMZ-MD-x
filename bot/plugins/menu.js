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

        let menuText = `*JAMZ-MD v6.0.0 MENU* 🫠\n\n`;
        menuText += `*Prefixes:* . / 🫠 #\n\n`;

        for (const [cat, cmds] of Object.entries(categories)) {
            menuText += `*───［ ${cat.toUpperCase()} ］───*\n`;
            cmds.sort().forEach(cmd => {
                menuText += ` ▢ ${prefix}${cmd}\n`;
            });
            menuText += `\n`;
        }

        menuText += `_Total Commands: ${plugins.size}_`;

        await sock.sendMessage(msg.key.remoteJid, { text: menuText }, { quoted: msg });
    }
};
