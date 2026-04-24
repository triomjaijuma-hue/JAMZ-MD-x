import { decodeJid } from '../../lib/utils.js';

export default {
    name: 'getpp',
    alias: ['getprofilepic'],
    desc: 'Get profile picture of a user.',
    category: 'general',
    usage: 'getpp @user',
    execute: async (sock, msg, { text }) => {
        let user = decodeJid(msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                   msg.message?.extendedTextMessage?.contextInfo?.participant ||
                   (text.replace(/[^0-9]/g, '') ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null));
        
        if (!user || user.length < 10) user = decodeJid(msg.key.remoteJid);

        try {
            const ppUrl = await sock.profilePictureUrl(user, 'image');
            await sock.sendMessage(msg.key.remoteJid, { image: { url: ppUrl }, caption: `Profile picture of @${user.split('@')[0]}` }, { quoted: msg, mentions: [user] });
        } catch (error) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to fetch profile picture. It might be private or not set.' }, { quoted: msg });
        }
    }
};
