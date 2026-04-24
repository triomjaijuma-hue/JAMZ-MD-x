import { 
    downloadMediaMessage, 
    generateForwardMessageContent, 
    generateWAMessageFromContent, 
    proto, 
    getContentType,
    jidDecode
} from './baileys.js';
import { decodeJid } from './serialize.js';

export function sethandler(sock) {
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        }
        return jid;
    };

    sock.downloadMediaMessage = async (message) => {
        const stream = await downloadMediaMessage(message, 'buffer', {}, {
            logger: console,
            reuploadRequest: sock.updateMediaMessage
        });
        return stream;
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
