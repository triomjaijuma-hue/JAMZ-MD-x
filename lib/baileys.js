import pkg from '@whiskeysockets/baileys';

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
