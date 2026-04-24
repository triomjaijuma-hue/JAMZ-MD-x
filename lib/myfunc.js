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
import sharp from 'sharp';

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
                'Upgrade-Insecure-Request': 1,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
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

export const parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

export const getGroupAdmins = (participants) => {
    let admins = [];
    for (let i of participants) {
        i.admin === "superadmin" ? admins.push(i.id) : i.admin === "admin" ? admins.push(i.id) : "";
    }
    return admins || [];
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

export const reSize = async (buffer, width, height) => {
    return await sharp(buffer)
        .resize(width, height)
        .toBuffer();
};

export const generateProfilePicture = async (buffer) => {
    const img = sharp(buffer);
    const metadata = await img.metadata();
    const min = Math.min(metadata.width, metadata.height);
    const cropped = img.extract({ 
        left: Math.floor((metadata.width - min) / 2), 
        top: Math.floor((metadata.height - min) / 2), 
        width: min, 
        height: min 
    });
    
    return {
        img: await cropped.resize(720, 720).toBuffer(),
        preview: await cropped.resize(120, 120).toBuffer()
    };
};

// We import smsg from serialize to maintain compatibility if anything still uses myfunc.smsg
import { smsg as _smsg } from './serialize.js';
export const smsg = _smsg;
