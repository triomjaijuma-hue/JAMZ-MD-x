import db from '../../lib/database.js';

export default {
    name: 'antidelete',
    alias: ['ad'],
    desc: 'Toggle Anti-Delete for this chat',
    category: 'owner',
    usage: 'antidelete [on/off]',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        
        const data = db.get();
        const chat = msg.key.remoteJid;
        const isGroup = chat.endsWith('@g.us');
        
        if (isGroup && !data.groups[chat]) data.groups[chat] = {};
        
        let currentState = isGroup ? data.groups[chat].antidelete : data.settings.antidelete;
        let status = args[0] ? args[0].toLowerCase() : (currentState ? 'off' : 'on');
        
        if (status === 'on') {
            if (isGroup) data.groups[chat].antidelete = true;
            else data.settings.antidelete = true;
            await sock.sendMessage(chat, { text: '✅ Anti-Delete has been enabled for this chat.' }, { quoted: msg });
        } else {
            if (isGroup) data.groups[chat].antidelete = false;
            else data.settings.antidelete = false;
            await sock.sendMessage(chat, { text: '❌ Anti-Delete has been disabled for this chat.' }, { quoted: msg });
        }
        db.save(data);
    }
};
