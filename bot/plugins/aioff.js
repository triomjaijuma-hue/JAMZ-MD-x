import db from '../../lib/database.js';

export default {
    name: 'aioff',
    alias: ['ai-off'],
    desc: 'Disable Auto-AI for this chat',
    category: 'owner',
    usage: 'aioff',
    execute: async (sock, msg, { isOwner }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        
        const data = db.get();
        const chat = msg.key.remoteJid;
        const isGroup = chat.endsWith('@g.us');
        
        if (isGroup && !data.groups[chat]) data.groups[chat] = {};
        
        if (isGroup) data.groups[chat].aion = false;
        else data.settings.aion = false;
        
        db.save(data);
        await sock.sendMessage(chat, { text: '❌ Auto-AI has been disabled for this chat.' }, { quoted: msg });
    }
};
