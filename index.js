import { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    Browsers, 
    makeInMemoryStore,
    jidDecode
} from './lib/baileys.js';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { Boom } from '@hapi/boom';
import chalk from 'chalk';
import { startServer } from './lib/server.js';
import db from './lib/database.js';
import config from './lib/config.js';
import { loadPlugins } from './lib/loader.js';
import { handler, callHandler, groupParticipantsHandler } from './lib/handler.js';
import { smsg, decodeJid } from './lib/myfunc.js';
import { socket as decorateSocket } from './lib/socket.js';

const logger = pino({ level: 'silent' });
const store = makeInMemoryStore({ logger });

// Load store
if (fs.existsSync(config.storePath)) {
    try {
        store.readFromFile(config.storePath);
        console.log(chalk.green('[SYSTEM] Store loaded.'));
    } catch (e) {
        // console.error(chalk.red('[SYSTEM] Failed to load store:'), e);
    }
}

// Periodic store save (Optimized for Railway)
setInterval(() => {
    try {
        const dir = path.dirname(config.storePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        store.writeToFile(config.storePath);
    } catch (e) {
        // console.error(chalk.red('[SYSTEM] Failed to save store:'), e);
    }
}, 1000 * 60 * 5); // Save every 5 minutes

// Memory Management
setInterval(() => {
    const memoryUsage = process.memoryUsage().rss / 1024 / 1024;
    if (memoryUsage > config.memoryLimit) { // Graceful exit at limit
        console.log(chalk.red(`[SYSTEM] Memory limit reached: ${memoryUsage.toFixed(2)}MB / ${config.memoryLimit}MB. Graceful exit...`));
        try {
            const dir = path.dirname(config.storePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            store.writeToFile(config.storePath);
        } catch (e) {}
        process.exit(1);
    }
}, 1000 * 30); // Check every 30 seconds

export let currentSock = null;
let currentQR = null;
let retryCount = 0;

async function startBot() {
    console.log(chalk.cyan('[SYSTEM] Starting JAMZ-MD...'));
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    let sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: true,
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false,
        markOnlineOnConnect: config.alwaysOnline,
        connectTimeoutMs: 60000,
        defaultContextInfo: {
            deviceListMetadata: {},
        },
    });

    currentSock = sock;
    store.bind(sock.ev);

    // Socket Decoration
    decorateSocket(sock, store);

    // Pairing code logic
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(config.pairingNumber);
                console.log(chalk.black(chalk.bgYellow(`[BOT] Pairing Code: ${code}`)));
            } catch (e) {
                // console.error(chalk.red('[BOT] Failed to request pairing code:'), e);
            }
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) currentQR = qr;

        if (connection === 'close') {
            currentQR = null;
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            console.log(chalk.yellow(`[BOT] Connection closed. Reason: ${reason}`));
            
            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red('[BOT] Logged out. Delete session and restart.'));
                process.exit(0);
            } else {
                retryCount++;
                const delay = Math.min(retryCount * 5000, 30000); // Exponential backoff
                console.log(chalk.cyan(`[BOT] Reconnecting in ${delay/1000}s... (Attempt ${retryCount})`));
                setTimeout(startBot, delay);
            }
        } else if (connection === 'open') {
            currentQR = null;
            retryCount = 0;
            console.log(chalk.green('[BOT] JAMZ-MD is now Online!'));
        }
    });

    sock.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = decodeJid(contact.id);
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const m of messages) {
            if (!m.message) return;
            const msg = smsg(sock, m, store);
            
            if (config.autoRead) await sock.readMessages([msg.key]);
            if (config.autoTyping) await sock.sendPresenceUpdate('composing', msg.chat);
            
            await handler(sock, msg, store);
        }
    });

    sock.ev.on('call', async (call) => {
        await callHandler(sock, call);
    });

    sock.ev.on('group-participants.update', async (update) => {
        await groupParticipantsHandler(sock, update);
    });

    return sock;
}

// Global Exception Handling
process.on('uncaughtException', (err) => {
    console.error(chalk.red('[FATAL] Uncaught Exception:'), err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('[FATAL] Unhandled Rejection at:'), promise, 'reason:', reason);
});

// Handle termination
const gracefulShutdown = () => {
    console.log(chalk.cyan('[SYSTEM] Shutting down gracefully...'));
    try {
        const dir = path.dirname(config.storePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        store.writeToFile(config.storePath);
        console.log(chalk.green('[SYSTEM] Store saved.'));
    } catch (e) {
        // console.error(chalk.red('[SYSTEM] Failed to save store during shutdown:'), e);
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
        console.error(chalk.red('[SYSTEM] Critical startup error:'), e);
        process.exit(1);
    }
}

main();
