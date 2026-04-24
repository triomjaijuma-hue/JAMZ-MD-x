import pkg from '@whiskeysockets/baileys';
const { jidDecode, getContentType } = pkg;

/**
 * Normalizes a JID by removing device IDs.
 * @param {string} jid 
 * @returns {string}
 */
export const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    }
    return jid;
};

/**
 * Unwraps nested messages (ephemeral, view-once, edited, etc.)
 * @param {object} m 
 * @returns {object}
 */
export const unwrap = (m) => {
    if (!m) return m;
    if (m.ephemeralMessage) return unwrap(m.ephemeralMessage.message);
    if (m.viewOnceMessage) return unwrap(m.viewOnceMessage.message);
    if (m.viewOnceMessageV2) return unwrap(m.viewOnceMessageV2.message);
    if (m.viewOnceMessageV2Extension) return unwrap(m.viewOnceMessageV2Extension.message);
    if (m.documentWithCaptionMessage) return unwrap(m.documentWithCaptionMessage.message);
    if (m.protocolMessage && m.protocolMessage.type === 14) return unwrap(m.protocolMessage.editedMessage);
    if (m.editMessage) return unwrap(m.editMessage.message);
    return m;
};

/**
 * Extracts message body/text from various message types.
 * @param {object} msg 
 * @returns {string}
 */
export const getMessageBody = (msg) => {
    const m = unwrap(msg.message);
    if (!m) return '';
    const type = getContentType(m);
    if (!type) return '';

    let body = (
        type === 'conversation' ? m.conversation :
        type === 'extendedTextMessage' ? m.extendedTextMessage.text :
        type === 'imageMessage' ? m.imageMessage.caption :
        type === 'videoMessage' ? m.videoMessage.caption :
        type === 'buttonsResponseMessage' ? m.buttonsResponseMessage.selectedButtonId :
        type === 'listResponseMessage' ? m.listResponseMessage.singleSelectReply.selectedRowId :
        type === 'templateButtonReplyMessage' ? m.templateButtonReplyMessage.selectedId :
        type === 'interactiveResponseMessage' ? m.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson :
        type === 'documentMessage' ? m.documentMessage.caption :
        ''
    ) || '';

    if (body && body.includes('"id":')) {
        try { body = JSON.parse(body).id; } catch {}
    }
    return body;
};
