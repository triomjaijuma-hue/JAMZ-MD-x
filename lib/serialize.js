import { jidDecode, getContentType, extractMessageContent } from './baileys.js';
import config from './config.js';

export const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    }
    return jid;
};

export const serialize = (sock, msg) => {
    if (!msg) return msg;
    
    const m = {};
    m.key = msg.key;
    m.isGroup = m.key.remoteJid.endsWith('@g.us');
    m.chat = decodeJid(m.key.remoteJid);
    m.fromMe = m.key.fromMe;
    m.id = m.key.id;
    m.sender = decodeJid(m.fromMe ? sock.user.id : (m.key.participant || m.key.remoteJid));

    if (msg.message) {
        m.message = extractMessageContent(msg.message);
        m.type = getContentType(m.message);
        
        // Handle Edit Message
        if (m.type === 'protocolMessage' && m.message.protocolMessage.type === 14) {
            m.message = extractMessageContent(m.message.protocolMessage.editedMessage);
            m.type = getContentType(m.message);
            m.isEdit = true;
        }

        m.msg = m.message[m.type];
        
        // Extract body
        let bodyText = '';
        if (m.type === 'conversation') bodyText = m.message.conversation;
        else if (m.type === 'extendedTextMessage') bodyText = m.message.extendedTextMessage.text;
        else if (m.type === 'imageMessage') bodyText = m.message.imageMessage.caption;
        else if (m.type === 'videoMessage') bodyText = m.message.videoMessage.caption;
        else if (m.type === 'buttonsResponseMessage') bodyText = m.message.buttonsResponseMessage.selectedButtonId;
        else if (m.type === 'listResponseMessage') bodyText = m.message.listResponseMessage.singleSelectReply.selectedRowId;
        else if (m.type === 'templateButtonReplyMessage') bodyText = m.message.templateButtonReplyMessage.selectedId;
        else if (m.type === 'interactiveResponseMessage') {
            const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) {
                try {
                    const params = JSON.parse(paramsJson);
                    bodyText = params.id;
                } catch {
                    bodyText = m.message.interactiveResponseMessage.body?.text;
                }
            } else {
                bodyText = m.message.interactiveResponseMessage.body?.text;
            }
        } else if (m.type === 'documentMessage') bodyText = m.message.documentMessage.caption;
        
        m.body = bodyText || '';

        m.mentions = m.msg?.contextInfo?.mentionedJid || [];
        m.quoted = m.msg?.contextInfo?.quotedMessage ? {
            key: {
                remoteJid: m.chat,
                fromMe: m.msg.contextInfo.participant === decodeJid(sock.user.id),
                id: m.msg.contextInfo.stanzaId,
                participant: m.msg.contextInfo.participant
            },
            message: extractMessageContent(m.msg.contextInfo.quotedMessage)
        } : null;

        if (m.quoted) {
            m.quoted.type = getContentType(m.quoted.message);
            m.quoted.msg = m.quoted.message[m.quoted.type];
            m.quoted.body = (
                m.quoted.type === 'conversation' ? m.quoted.message.conversation :
                m.quoted.type === 'extendedTextMessage' ? m.quoted.message.extendedTextMessage.text :
                m.quoted.type === 'imageMessage' ? m.quoted.message.imageMessage.caption :
                m.quoted.type === 'videoMessage' ? m.quoted.message.videoMessage.caption :
                m.quoted.type === 'documentMessage' ? m.quoted.message.documentMessage.caption :
                ''
            ) || '';
            m.quoted.isBot = m.quoted.key.fromMe || m.quoted.key.participant === decodeJid(sock.user.id);
            m.quoted.sender = decodeJid(m.quoted.key.participant);
        }
    }

    // Convenience methods
    m.reply = async (text, options = {}) => {
        return sock.sendMessage(m.chat, { text, mentions: [m.sender, ...(options.mentions || [])], ...options }, { quoted: msg, ...options });
    };

    m.delete = async () => {
        return sock.sendMessage(m.chat, { delete: m.key });
    };

    m.react = async (emoji) => {
        return sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
    };

    return m;
};
