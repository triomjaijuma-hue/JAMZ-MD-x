import { 
    downloadMediaMessage, 
    generateForwardMessageContent, 
    generateWAMessageFromContent, 
    proto, 
    getContentType,
    jidDecode
} from './baileys.js';
import fs from 'fs';
import { getBuffer, fetchJson, decodeJid } from './myfunc.js';

export function socket(sock, store) {
    sock.decodeJid = (jid) => decodeJid(jid);

    sock.getName = (jid, withoutContact = false) => {
        let id = sock.decodeJid(jid);
        withoutContact = sock.withoutContact || withoutContact;
        let v;
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {};
            if (!(v.name || v.subject)) v = await sock.groupMetadata(id) || {};
            resolve(v.name || v.subject || id.replace(/@g.us/, ''));
        });
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === sock.decodeJid(sock.user.id) ?
            sock.user :
            (store.contacts[id] || {});
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || id.replace(/@s.whatsapp.net/, '');
    };

    sock.sendContact = async (jid, kon, quoted = '', opts = {}) => {
        let list = [];
        for (let i of kon) {
            list.push({
                displayName: await sock.getName(i + '@s.whatsapp.net'),
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await sock.getName(i + '@s.whatsapp.net')}\nFN:${await sock.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            });
        }
        return sock.sendMessage(jid, { contacts: { displayName: `${list.length} Contact`, contacts: list }, ...opts }, { quoted });
    };

    sock.sendText = (jid, text, quoted = '', options) => sock.sendMessage(jid, { text: text, ...options }, { quoted });

    sock.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadMediaMessage(message, 'buffer', {}, {
            logger: console,
            reuploadRequest: sock.updateMediaMessage
        });
        return stream;
    };

    sock.sendImage = async (jid, path, caption = '', quoted = '', options) => {
        let buffer = Buffer.isBuffer(path) ? path : /^https?:\/\//.test(path) ? await getBuffer(path) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        return await sock.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted });
    };

    sock.sendVideo = async (jid, path, caption = '', quoted = '', options) => {
        let buffer = Buffer.isBuffer(path) ? path : /^https?:\/\//.test(path) ? await getBuffer(path) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        return await sock.sendMessage(jid, { video: buffer, caption: caption, ...options }, { quoted });
    };

    sock.sendAudio = async (jid, path, quoted = '', ptt = false, options) => {
        let buffer = Buffer.isBuffer(path) ? path : /^https?:\/\//.test(path) ? await getBuffer(path) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        return await sock.sendMessage(jid, { audio: buffer, ptt: ptt, ...options }, { quoted });
    };

    sock.sendPoll = (jid, name = '', values = [], selectableCount = 1) => {
        return sock.sendMessage(jid, { poll: { name, values, selectableCount } });
    };

    sock.copyNForward = async (jid, message, forceForward = false, options = {}) => {
        let vtype;
        if (options.readViewOnce) {
            message.message = message.message && message.message.viewOnceMessage && message.message.viewOnceMessage.message ? message.message.viewOnceMessage.message : (message.message || undefined);
            vtype = getContentType(message.message);
            let m = message.message[vtype];
            delete m.viewOnce;
            message.message = { [vtype]: m };
        }

        let mtype = getContentType(message.message);
        let content = generateForwardMessageContent(message, forceForward);
        let ctype = getContentType(content);
        let context = {};
        if (mtype != "conversation") context = message.message[mtype].contextInfo;
        content[ctype].contextInfo = {
            ...context,
            ...content[ctype].contextInfo
        };
        const waMessage = generateWAMessageFromContent(jid, content, options ? {
            ...options,
            ...(Object.keys(context).length > 0 ? { contextInfo: { ...context, ...options.contextInfo } } : {})
        } : {});
        await sock.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
        return waMessage;
    };

    return sock;
}
