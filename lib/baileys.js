import pkg from '@whiskeysockets/baileys';

// Handle both default and named exports
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
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto,
    areJidsSameUser,
    extractMessageContent
} = pkg;

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
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto,
    areJidsSameUser,
    extractMessageContent
};

export default makeWASocket;
