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

// Validate and create store safely
let store;
try {
    store = makeInMemoryStore({ logger });
    if (!store) {
        throw new Error('makeInMemoryStore returned null or undefined');
    }
} catch (error) {
    console.error(chalk.red('[CRITICAL] Failed to create store:'), error.message);
    // Create a fallback minimal store
    store = {
        readFromFile: () => {},
        writeToFile: () => {},
        bind: () => {},
        contacts: {},
        messages: {},
        chats: [],
        loadMessage: async () => null,
        getMessage: async () => null
    };
}

// Load store from persistent storage
const storePath = config.storePath;
if (fs.existsSync(storePath)) {
    try {
        store.readFromFile(storePath);
        console.log(chalk.green('[SYSTEM] ✅ Store loaded successfully.'));
    } catch (e) {
        console.warn(chalk.yellow('[SYSTEM] ⚠️ Could not load store, starting fresh:'), e.message);
    }
}

// Periodic store save (Optimized for Railway/Persistent Storage)
setInterval(() => {
    try {
        const dir = path.dirname(storePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (store && typeof store.writeToFile === 'function') {
            store.writeToFile(storePath);
        }
    } catch (e) {
        console.warn(chalk.yellow('[SYSTEM] Store save failed:'), e.message);
    }
}, 1000 * 60 * 2); // Save every 2 minutes

// Memory Monitoring (MEGA-MD Style)
setInterval(() => {
    try {
        const usage = process.memoryUsage();
        const rss = usage.rss / 1024 / 1024;
        const heapUsed = usage.heapUsed / 1024 / 1024;
        
        if (rss > config.memoryLimit) {
            console.log(chalk.red(`[CRITICAL] 🚨 Memory limit exceeded: ${rss.toFixed(2)}MB/${config.memoryLimit}MB`));
            console.log(chalk.yellow('[SYSTEM] Attempting graceful shutdown...'));
            try { 
                if (store && typeof store.writeToFile === 'function') {
                    store.writeToFile(storePath); 
                }
            } catch (e) {}
            process.exit(0); // Exit gracefully so Docker/Railway can restart
        } else if (rss > config.memoryLimit * 0.8) {
            console.log(chalk.yellow(`[WARNING] Memory usage high: ${rss.toFixed(2)}MB/${config.memoryLimit}MB`));
        }
    } catch (e) {
        console.error(chalk.red('[ERROR] Memory monitoring failed:'), e.message);
    }
}, 1000 * 60);

const msgRetryCounterCache = new NodeCache();

export let currentSock = null;
let currentQR = null;
let retryCount = 0;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '5');

async function startBot() {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║    ██████╗ ███████╗ ██████╗  ██████╗ ███╗   ██╗██╗   ██╗██████╗  ║
║    ██╔══██╗██╔════╝██╔════╝ ██╔═══██╗████╗  ██║██║   ██║██╔══██╗ ║
║    ██████╔╝█████╗  ██║  ███╗██║   ██║██╔██╗ ██║██║   ██║██████╔╝ ║
║    ██╔══██╗██╔══╝  ██║   ██║██║   ██║██║╚██╗██║██║   ██║██╔══██╗ ║
║    ██║  ██║███████╗╚██████╔╝╚██████╔╝██║ ╚████║╚██████╔╝██████╔╝ ║
║    ╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝  ║
║                                                                   ║
║               MEGA-MD PRODUCTION STABLE v1.2.0                    ║
╚═══════════════════════════════════════════════════════════════════╝
    `));

    try {
        const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        
        console.log(chalk.blue(`[SYSTEM] Using Baileys version: ${version.join('.')} ${isLatest ? '✅ (Latest)' : '⚠️ (Outdated)'}`));

        const sock = makeWASocket({
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
                try {
                    if (store && typeof store.loadMessage === 'function') {
                        const msg = await store.loadMessage(key.remoteJid, key.id);
                        return msg?.message || undefined;
                    }
                } catch (e) {}
                return {
                    conversation: "JAMZ-MD - Reliable Messaging"
                };
            }
        });

        currentSock = sock;
        
        if (store && typeof store.bind === 'function') {
            store.bind(sock.ev);
        }
        
        try {
            decorateSocket(sock, store);
        } catch (e) {
            console.warn(chalk.yellow('[SYSTEM] Socket decoration encountered error:'), e.message);
        }

        // Pairing Code Request
        if (!sock.authState.creds.registered) {
            if (config.pairingNumber) {
                console.log(chalk.yellow(`[SYSTEM] 📞 Requesting pairing code for ${config.pairingNumber}...`));
                setTimeout(async () => {
                    try {
                        const code = await sock.requestPairingCode(config.pairingNumber.replace(/[^0-9]/g, ''));
                        console.log(chalk.white.bgGreen.bold(`\n ✅ PAIRING CODE: ${code} \n`));
                    } catch (e) {
                        console.error(chalk.red('[SYSTEM] Pairing Code Error:'), e.message);
                    }
                }, 3000);
            }
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                currentQR = qr;
                console.log(chalk.cyan('[QR] 📱 New QR code available - scan to authenticate'));
            }

            if (connection === 'close') {
                currentQR = null;
                
                const error = new Boom(lastDisconnect?.error);
                const statusCode = error?.output?.statusCode;
                
                console.log(chalk.yellow(`[SYSTEM] ❌ Connection closed. Status: ${statusCode}`));

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(chalk.red('[SYSTEM] 🚪 Logged out. Session destroyed. Please delete ./session and restart.'));
                    process.exit(0);
                } else if (statusCode === DisconnectReason.connectionClosed) {
                    console.log(chalk.yellow('[SYSTEM] Connection closed by server'));
                } else if (statusCode === DisconnectReason.connectionLost) {
                    console.log(chalk.yellow('[SYSTEM] Connection lost'));
                } else if (statusCode === DisconnectReason.connectionReplaced) {
                    console.log(chalk.yellow('[SYSTEM] Connection replaced by another device'));
                    process.exit(0);
                } else if (statusCode === DisconnectReason.restartRequired) {
                    console.log(chalk.yellow('[SYSTEM] Restart required'));
                } else if (statusCode === DisconnectReason.timedOut) {
                    console.log(chalk.yellow('[SYSTEM] Connection timed out'));
                }

                if (retryCount >= MAX_RETRIES) {
                    console.log(chalk.red(`[CRITICAL] 🚨 Max reconnect attempts (${MAX_RETRIES}) reached. Exiting...`));
                    process.exit(0);
                }

                retryCount++;
                const delay = Math.min(retryCount * 5000, 30000);
                console.log(chalk.cyan(`[SYSTEM] ⏳ Reconnecting in ${(delay/1000).toFixed(0)}s... (Attempt ${retryCount}/${MAX_RETRIES})`));
                setTimeout(startBot, delay);
            } else if (connection === 'open') {
                currentQR = null;
                retryCount = 0;
                console.log(chalk.green.bold('[SYSTEM] ✅ MEGA-MD Connected and ready!'));
            } else if (connection === 'connecting') {
                console.log(chalk.blue('[SYSTEM] 🔗 Connecting...'));
            }
        });

        sock.ev.on('contacts.update', update => {
            for (let contact of update) {
                const id = decodeJid(contact.id);
                if (store && store.contacts) {
                    store.contacts[id] = { id, name: contact.notify };
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            for (const m of messages) {
                try {
                    if (!m.message) continue;
                    
                    const msg = smsg(sock, m, store);
                    
                    // Auto-read messages
                    if (config.autoRead) {
                        try {
                            await sock.readMessages([msg.key]);
                        } catch (e) {
                            console.warn(chalk.yellow('[MSG] Could not mark as read:'), e.message);
                        }
                    }
                    
                    // Show typing indicator
                    if (config.autoTyping) {
                        try {
                            await sock.sendPresenceUpdate('composing', msg.chat);
                        } catch (e) {}
                    }
                    
                    // Handle message
                    await handler(sock, msg, store);
                } catch (e) {
                    console.error(chalk.red('[MESSAGES] Processing error:'), e.message);
                }
            }
        });

        sock.ev.on('call', async (call) => {
            try {
                await callHandler(sock, call);
            } catch (e) {
                console.error(chalk.red('[CALL] Handler error:'), e.message);
            }
        });

        sock.ev.on('group-participants.update', async (update) => {
            try {
                await groupParticipantsHandler(sock, update);
            } catch (e) {
                console.error(chalk.red('[GROUP] Handler error:'), e.message);
            }
        });

        return sock;
    } catch (error) {
        console.error(chalk.red('[CRITICAL] Bot initialization failed:'), error.message);
        console.error(error);
        
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
            console.error(chalk.red(`[CRITICAL] Max retry attempts reached. Exiting...`));
            process.exit(1);
        }
        
        const delay = Math.min(retryCount * 5000, 30000);
        console.log(chalk.cyan(`[SYSTEM] Retrying in ${(delay/1000).toFixed(0)}s...`));
        setTimeout(startBot, delay);
    }
}

// Robust Process Handlers
process.on('uncaughtException', (err) => {
    console.error(chalk.red('[FATAL ERROR] Uncaught Exception:'), err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('[FATAL ERROR] Unhandled Rejection:'), reason);
});

const shutdown = async () => {
    console.log(chalk.yellow('\n[SYSTEM] 🛑 Shutting down gracefully...'));
    try {
        if (currentSock) {
            currentSock.end();
        }
        if (store && typeof store.writeToFile === 'function') {
            store.writeToFile(storePath);
            console.log(chalk.green('[SYSTEM] Store saved.'));
        }
        setTimeout(() => process.exit(0), 1000);
    } catch (e) {
        console.error(chalk.red('[SYSTEM] Shutdown error:'), e.message);
        process.exit(1);
    }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function init() {
    try {
        console.log(chalk.cyan('[SYSTEM] 📂 Loading plugins...'));
        await loadPlugins();
        
        console.log(chalk.cyan('[SYSTEM] 🤖 Starting bot...'));
        await startBot();
        
        console.log(chalk.cyan('[SYSTEM] 🌐 Starting web server...'));
        startServer(() => ({ sock: currentSock, qr: currentQR }));
    } catch (e) {
        console.error(chalk.red('[SYSTEM] Initialization failed:'), e.message);
        console.error(e);
        process.exit(1);
    }
}

init();
