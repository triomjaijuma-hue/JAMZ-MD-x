import db from '../../lib/database.js';

export default {
    name: 'aion',
    alias: ['ai-on'],
    desc: 'Enable Auto-AI for this chat',
    category: 'owner',
    usage: 'aion',
    execute: async (sock, msg, { isOwner }) => {
        if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        
        const data = db.get();
        const chat = msg.key.remoteJid;
        const isGroup = chat.endsWith('@g.us');
        
        if (isGroup && !data.groups[chat]) data.groups[chat] = {};
        
        if (isGroup) data.groups[chat].aion = true;
        else data.settings.aion = true;
        
        db.save(data);
        await sock.sendMessage(chat, { text: '✅ Auto-AI has been enabled for this chat. The bot will now respond to all messages.' }, { quoted: msg });
    }
};
