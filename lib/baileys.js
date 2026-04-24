import * as baileys from '@whiskeysockets/baileys';

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidDecode,
    Browsers,
    makeInMemoryStore,
    getContentType,
    downloadMediaMessage,
    downloadContentFromMessage,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto,
    areJidsSameUser,
    extractMessageContent,
    WA_DEFAULT_EPHEMERAL
} = baileys.default ? baileys : { default: baileys.default, ...baileys };

export {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidDecode,
    Browsers,
    makeInMemoryStore,
    getContentType,
    downloadMediaMessage,
    downloadContentFromMessage,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto,
    areJidsSameUser,
    extractMessageContent,
    WA_DEFAULT_EPHEMERAL
};

export default makeWASocket;
