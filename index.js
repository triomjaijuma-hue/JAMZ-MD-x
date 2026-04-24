import { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    Browsers, 
    makeInMemoryStore 
} from './lib/baileys.js';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { startServer } from './lib/server.js';
import db from './lib/database.js';
import config from './lib/config.js';
import { loadPlugins } from './lib/loader.js';
import { handler } from './lib/handler.js';

const logger = pino({ level: 'silent' });
const store = makeInMemoryStore({ logger });

// Load store
if (fs.existsSync(config.storePath)) {
    try {
        store.readFromFile(config.storePath);
        console.log('[SYSTEM] Store loaded.');
    } catch (e) {
        console.error('[SYSTEM] Failed to load store:', e);
    }
}

// Periodic store save
setInterval(() => {
    try {
        const dir = path.dirname(config.storePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        store.writeToFile(config.storePath);
    } catch (e) {
        console.error('[SYSTEM] Failed to save store:', e);
    }
}, 30000);

export let currentSock = null;
let currentQR = null;

// Memory monitoring
setInterval(() => {
    const used = process.memoryUsage();
    if (used.rss > 450 * 1024 * 1024) { // 450MB warning for Railway (usually 512MB limit)
        console.warn(`[SYSTEM] High Memory Usage: ${Math.round(used.rss / 1024 / 1024)}MB`);
    }
}, 60000);

async function startBot() {
    console.log('[SYSTEM] Starting JAMZ-MD...');
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultContextInfo: {
            deviceListMetadata: {},
        },
    });

    currentSock = sock;
    store.bind(sock.ev);

    // Pairing code logic
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(config.pairingNumber);
                console.log(`[BOT] Pairing Code: ${code}`);
            } catch (e) {
                console.error('[BOT] Failed to request pairing code:', e);
            }
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) currentQR = qr;

        if (connection === 'close') {
            currentQR = null;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[BOT] Connection closed (Reason: ${statusCode}). Reconnecting: ${shouldReconnect}`);
            
            if (shouldReconnect) {
                // Exponential backoff or simple delay
                setTimeout(() => startBot(), 5000);
            } else {
                console.log('[BOT] Logged out. Please delete the session folder and restart.');
                process.exit(0);
            }
        } else if (connection === 'open') {
            currentQR = null;
            console.log('[BOT] JAMZ-MD is now Online!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const m of messages) {
            await handler(sock, m, store);
        }
    });

    return sock;
}

// Global Exception Handling
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    // On Railway, we might want to stay alive if possible, but some errors are fatal
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle termination
const gracefulShutdown = () => {
    console.log('[SYSTEM] Shutting down gracefully...');
    try {
        const dir = path.dirname(config.storePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        store.writeToFile(config.storePath);
        console.log('[SYSTEM] Store saved.');
    } catch (e) {
        console.error('[SYSTEM] Failed to save store during shutdown:', e);
    }
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

async function main() {
    try {
        await loadPlugins();
        await startBot();
        startServer(() => ({ sock: currentSock, qr: currentQR }));
    } catch (e) {
        console.error('[SYSTEM] Critical startup error:', e);
        process.exit(1);
    }
}

main();
