import { jidDecode, getContentType, extractMessageContent, downloadContentFromMessage, prepareWAMessageMedia, generateWAMessageFromContent, proto } from './baileys.js';
import config from './config.js';

export const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    }
    return jid;
};

export const smsg = (sock, m, store) => {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    if (m.key) {
        m.id = m.key.id;
        m.isBot = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = decodeJid(m.key.remoteJid);
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = decodeJid(m.fromMe ? sock.user.id : (m.key.participant || m.key.remoteJid));
        if (m.isGroup) m.participant = decodeJid(m.key.participant) || '';
    }
    if (m.message) {
        m.mtype = getContentType(m.message);
        
        // Handle Edit Message
        if (m.mtype === 'protocolMessage' && m.message.protocolMessage?.type === 14) {
            m.message = extractMessageContent(m.message.protocolMessage.editedMessage);
            m.mtype = getContentType(m.message);
            m.isEdit = true;
        }

        m.msg = (m.mtype === 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        m.body = m.message.conversation || (m.msg && m.msg.caption) || (m.msg && m.msg.text) || (m.mtype === 'listResponseMessage' && m.msg.singleSelectReply.selectedRowId) || (m.mtype === 'buttonsResponseMessage' && m.msg.selectedButtonId) || (m.mtype === 'viewOnceMessage' && m.msg.caption) || m.mtype || '';
        
        // Comprehensive body extraction
        let bodyText = '';
        if (m.mtype === 'conversation') bodyText = m.message.conversation;
        else if (m.mtype === 'extendedTextMessage') bodyText = m.message.extendedTextMessage.text;
        else if (m.mtype === 'imageMessage') bodyText = m.message.imageMessage.caption;
        else if (m.mtype === 'videoMessage') bodyText = m.message.videoMessage.caption;
        else if (m.mtype === 'buttonsResponseMessage') bodyText = m.message.buttonsResponseMessage.selectedButtonId;
        else if (m.mtype === 'listResponseMessage') bodyText = m.message.listResponseMessage.singleSelectReply.selectedRowId;
        else if (m.mtype === 'templateButtonReplyMessage') bodyText = m.message.templateButtonReplyMessage.selectedId;
        else if (m.mtype === 'interactiveResponseMessage') {
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
        } else if (m.mtype === 'documentMessage') bodyText = m.message.documentMessage.caption;
        
        if (bodyText) m.body = bodyText;

        let quoted = m.quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : [];
        if (m.quoted) {
            let type = getContentType(quoted);
            m.quoted = quoted[type];
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted);
                m.quoted = m.quoted[type];
            }
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };
            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = decodeJid(m.msg.contextInfo.remoteJid || m.chat);
            m.quoted.isBot = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === decodeJid(sock.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false;
                let q = await store.loadMessage(m.chat, m.quoted.id, sock);
                return smsg(sock, q, store);
            };
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id,
                    participant: m.quoted.sender
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            });

            m.quoted.delete = () => sock.sendMessage(m.quoted.chat, { delete: vM.key });
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => sock.copyNForward(jid, vM, forceForward, options);
            m.quoted.download = () => sock.downloadMediaMessage(vM);
        }
    }
    if (m.msg && m.msg.url) m.download = () => sock.downloadMediaMessage(m);
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';
    
    m.reply = (text, options = {}) => sock.sendMessage(m.chat, { text, mentions: [m.sender, ...(options.mentions || [])], ...options }, { quoted: m, ...options });
    
    m.copy = () => smsg(sock, M.fromObject(M.toObject(m)));
    
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => sock.copyNForward(jid, m, forceForward, options);

    return m;
};

export const serialize = smsg; // Backward compatibility
