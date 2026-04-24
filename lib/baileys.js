import pkg from '@whiskeysockets/baileys';

// Correctly handle Baileys exports for ESM
export const makeWASocket = pkg.default || pkg.makeWASocket;
export const {
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
} = pkg;

export default makeWASocket;
