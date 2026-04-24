import { 
    getContentType, 
    jidDecode, 
    downloadContentFromMessage, 
    proto, 
    areJidsSameUser,
    extractMessageContent
} from './baileys.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { sizeFormatter } from 'human-readable';

export const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    }
    return jid;
};

export const getBuffer = async (url, options) => {
    try {
        options ? options : {};
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (e) {
        return null;
    }
};

export const fetchJson = async (url, options) => {
    try {
        options ? options : {};
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

export const runtime = (seconds) => {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

export const clockString = (ms) => {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
};

export const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const generateMessageTag = (epoch) => {
    let tag = (227 + (epoch || new Date().getTime())).toString();
    return tag;
};

export const getSizeMedia = (PATH) => {
    return new Promise((resolve, reject) => {
        if (/^https?:\/\//.test(PATH)) {
            axios.get(PATH).then((res) => {
                let length = parseInt(res.headers['content-length']);
                let size = sizeFormatter({
                    std: 'JEDEC',
                    decimalPlaces: 2,
                    keepTrailingZeros: false,
                    render: (literal, symbol) => `${literal} ${symbol}`
                })(length);
                resolve(size);
            });
        } else if (Buffer.isBuffer(PATH)) {
            let length = PATH.length;
            let size = sizeFormatter({
                std: 'JEDEC',
                decimalPlaces: 2,
                keepTrailingZeros: false,
                render: (literal, symbol) => `${literal} ${symbol}`
            })(length);
            resolve(size);
        } else if (fs.existsSync(PATH)) {
            let length = fs.statSync(PATH).size;
            let size = sizeFormatter({
                std: 'JEDEC',
                decimalPlaces: 2,
                keepTrailingZeros: false,
                render: (literal, symbol) => `${literal} ${symbol}`
            })(length);
            resolve(size);
        } else {
            reject('File not found');
        }
    });
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
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        m.body = m.message.conversation || (m.msg && m.msg.caption) || (m.msg && m.msg.text) || (m.mtype == 'listResponseMessage' && m.msg.singleSelectReply.selectedRowId) || (m.mtype == 'buttonsResponseMessage' && m.msg.selectedButtonId) || (m.mtype == 'viewOnceMessage' && m.msg.caption) || m.mtype || '';
        
        let quoted = m.quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : [];
        if (m.quoted) {
            let type = getContentType(quoted);
            m.quoted = quoted[type];
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted);
                m.quoted = m.quoted[type];
            }
            if (typeof m.quoted === 'string') m.quoted = {
                text: m.quoted
            };
            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = decodeJid(m.msg.contextInfo.remoteJid || m.chat);
            m.quoted.isBot = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === (sock.user && sock.user.id);
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
    
    m.reply = (text, options = {}) => sock.sendMessage(m.chat, { text, ...options }, { quoted: m, ...options });
    
    m.copy = () => smsg(sock, M.fromObject(M.toObject(m)));
    
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => sock.copyNForward(jid, m, forceForward, options);

    return m;
};
