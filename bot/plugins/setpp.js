import * as baileysNS from '@whiskeysockets/baileys';

// Robust export extraction helper
const getBaileysExport = (prop) => {
    if (baileysNS[prop] !== undefined) return baileysNS[prop];
    if (baileysNS.default && typeof baileysNS.default === 'object' && baileysNS.default[prop] !== undefined) {
        return baileysNS.default[prop];
    }
    return undefined;
};

const downloadMediaMessage = getBaileysExport('downloadMediaMessage');
import axios from 'axios';

export default {
    name: 'setpp',
    alias: ['setprofilepic', 'setbotpp'],
    desc: 'Set the bot profile picture by replying to an image or providing a URL.',
    category: 'owner',
    usage: 'setpp [url | default] (or reply to an image)',
    execute: async (sock, msg, { isOwner, args }) => {
        if (!isOwner) {
            return sock.sendMessage(msg.key.remoteJid, { text: 'This command is only for the bot owner.' }, { quoted: msg });
        }

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let buffer;

        try {
            if (quoted && quoted.imageMessage) {
                await sock.sendMessage(msg.key.remoteJid, { text: '🔄 Downloading replied image...' }, { quoted: msg });
                buffer = await downloadMediaMessage(
                    { key: msg.key, message: quoted },
                    'buffer',
                    {},
                    { 
                        reuploadRequest: sock.updateMediaMessage
                    }
                );
            } else if (args[0] === 'default') {
                await sock.sendMessage(msg.key.remoteJid, { text: '🔄 Setting default profile picture...' }, { quoted: msg });
                const res = await axios.get('https://github.com/jumaxjaitom-x.png', { responseType: 'arraybuffer' });
                buffer = Buffer.from(res.data, 'binary');
            } else if (args[0] && args[0].startsWith('http')) {
                await sock.sendMessage(msg.key.remoteJid, { text: '🔄 Downloading image from URL...' }, { quoted: msg });
                const res = await axios.get(args[0], { responseType: 'arraybuffer' });
                buffer = Buffer.from(res.data, 'binary');
            } else {
                return sock.sendMessage(msg.key.remoteJid, { text: '❌ Please reply to an image, provide an image URL, or use `setpp default`.' }, { quoted: msg });
            }

            if (!buffer) throw new Error('Failed to obtain image buffer.');

            await sock.updateProfilePicture(sock.user.id.split(':')[0] + '@s.whatsapp.net', buffer);
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Successfully updated profile picture!' }, { quoted: msg });
        } catch (e) {
            console.error('Error in setpp:', e);
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to update profile picture. Error: ' + e.message }, { quoted: msg });
        }
    }
};
