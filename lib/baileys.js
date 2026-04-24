import pkg from '@whiskeysockets/baileys';
const baileys = pkg.default || pkg;
export const { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    Browsers, 
    makeInMemoryStore,
    jidDecode,
    getContentType,
    downloadMediaMessage,
    downloadContentFromMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    proto,
    areJidsSameUser,
    extractMessageContent,
    WA_DEFAULT_EPHEMERAL
} = baileys;
export default makeWASocket;
