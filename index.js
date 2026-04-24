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
import { Boom } from '@hapi/boom';
import chalk from 'chalk';
import { startServer } from './lib/server.js';
import db from './lib/database.js';
import config from './lib/config.js';
import { loadPlugins } from './lib/loader.js';
import { handler, callHandler, groupParticipantsHandler } from './lib/handler.js';
import { smsg } from './lib/serialize.js';
import { socket as decorateSocket } from './lib/socket.js';

const logger = pino({ level: 'silent' });
const store = makeInMemoryStore({ logger });

// Load store
if (fs.existsSync(config.storePath)) {
    try {
        store.readFromFile(config.storePath);
        console.log(chalk.green('[SYSTEM] Store loaded.'));
    } catch (e) {
        console.error(chalk.red('[SYSTEM] Failed to load store:'), e);
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
    if (memoryUsage > config.memoryLimit) {
        console.log(chalk.red(`[SYSTEM] Memory limit exceeded: ${memoryUsage.toFixed(2)}MB / ${config.memoryLimit}MB. Restarting...`));
        try {
            const dir = path.dirname(config.storePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            store.writeToFile(config.storePath);
        } catch (e) {}
        process.exit(1); // Railway will restart the container
    }
}, 1000 * 60); // Check every minute

export let currentSock = null;
let currentQR = null;

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
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
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
                console.log(chalk.yellow(`[BOT] Pairing Code: ${code}`));
            } catch (e) {
                console.error(chalk.red('[BOT] Failed to request pairing code:'), e);
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
            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red('[BOT] Connection closed. Logged out.'));
                process.exit(0);
            } else {
                console.log(chalk.yellow(`[BOT] Connection closed. Reason: ${reason}. Reconnecting...`));
                startBot();
            }
        } else if (connection === 'open') {
            currentQR = null;
            console.log(chalk.green('[BOT] JAMZ-MD is now Online!'));
        }
    });

    sock.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = sock.decodeJid(contact.id);
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
        console.error(chalk.red('[SYSTEM] Failed to save store during shutdown:'), e);
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
