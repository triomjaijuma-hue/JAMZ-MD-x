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
import NodeCache from 'node-cache';
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
        console.log(chalk.green('[SYSTEM] Store loaded successfully.'));
    } catch (e) {
        console.error(chalk.red('[SYSTEM] Failed to load store:'), e);
    }
}

// Periodic store save (Optimized for Railway/Persistent Storage)
setInterval(() => {
    try {
        const dir = path.dirname(config.storePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        store.writeToFile(config.storePath);
    } catch (e) {}
}, 1000 * 60 * 2); // Save every 2 minutes

// Memory Monitoring (MEGA-MD Style)
setInterval(() => {
    const usage = process.memoryUsage();
    const rss = usage.rss / 1024 / 1024;
    const heapUsed = usage.heapUsed / 1024 / 1024;
    
    if (rss > config.memoryLimit) {
        console.log(chalk.red(`[CRITICAL] Memory limit exceeded: ${rss.toFixed(2)}MB. Restarting...`));
        try { store.writeToFile(config.storePath); } catch (e) {}
        process.exit(1);
    }
}, 1000 * 60);

const msgRetryCounterCache = new NodeCache();

export let currentSock = null;
let currentQR = null;
let retryCount = 0;

async function startBot() {
    console.log(chalk.cyan(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                              ┃
┃   ██████╗ ███████╗ ██████╗  ██████╗ ███╗   ██╗██╗   ██╗██████╗ ┃
┃   ██╔══██╗██╔════╝██╔════╝ ██╔═══██╗████╗  ██║██║   ██║██╔══██╗┃
┃   ██████╔╝█████╗  ██║  ███╗██║   ██║██╔██╗ ██║██║   ██║██████╔╝┃
┃   ██╔══██╗██╔══╝  ██║   ██║██║   ██║██║╚██╗██║██║   ██║██╔══██╗┃
┃   ██║  ██║███████╗╚██████╔╝╚██████╔╝██║ ╚████║╚██████╔╝██████╔╝┃
┃   ╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ┃
┃                                                              ┃
┃                MEGA-MD RECONSTRUCTION v1.0.0                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`));

    const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(chalk.blue(`[SYSTEM] Using Baileys version: ${version.join('.')} (Latest: ${isLatest})`));

    let sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: Browsers.ubuntu('Chrome'),
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: config.alwaysOnline,
        connectTimeoutMs: 60000,
        defaultContextInfo: {
            deviceListMetadata: {},
        },
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return {
                conversation: "JAMZ-MD - Reliable Messaging"
            };
        }
    });

    currentSock = sock;
    store.bind(sock.ev);
    decorateSocket(sock, store);

    // Pairing Code Request
    if (!sock.authState.creds.registered) {
        if (config.pairingNumber) {
            console.log(chalk.yellow(`[SYSTEM] Requesting pairing code for ${config.pairingNumber}...`));
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(config.pairingNumber.replace(/[^0-9]/g, ''));
                    console.log(chalk.white.bgGreen.bold(`\n PAIRING CODE: ${code} \n`));
                } catch (e) {
                    console.error(chalk.red('[SYSTEM] Pairing Code Error:'), e);
                }
            }, 3000);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) currentQR = qr;

        if (connection === 'close') {
            currentQR = null;
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            console.log(chalk.yellow(`[SYSTEM] Connection closed. Reason: ${reason}`));

            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red('[SYSTEM] Logged out. Session destroyed. Please delete session folder and restart.'));
                process.exit(0);
            } else {
                retryCount++;
                const delay = Math.min(retryCount * 5000, 30000);
                console.log(chalk.cyan(`[SYSTEM] Reconnecting in ${delay/1000}s... (Attempt ${retryCount})`));
                setTimeout(startBot, delay);
            }
        } else if (connection === 'open') {
            currentQR = null;
            retryCount = 0;
            console.log(chalk.green.bold('[SYSTEM] MEGA-MD Connection established!'));
            
            // Auto-Join Support Group if needed
            // await sock.groupAcceptInvite('...').catch(() => {});
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

// Robust Process Handlers
process.on('uncaughtException', (err) => {
    console.error(chalk.red('[FATAL ERROR]'), err);
    // Don't exit on all errors, but log them
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('[UNHANDLED REJECTION] at:'), promise, 'reason:', reason);
});

const shutdown = async () => {
    console.log(chalk.yellow('\n[SYSTEM] Shutting down gracefully...'));
    try {
        if (store) store.writeToFile(config.storePath);
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function init() {
    try {
        await loadPlugins();
        await startBot();
        startServer(() => ({ sock: currentSock, qr: currentQR }));
    } catch (e) {
        console.error(chalk.red('[SYSTEM] Initialization failed:'), e);
        process.exit(1);
    }
}

init();
