import * as baileysNS from '@whiskeysockets/baileys';

// Robust export extraction helper
const getBaileysExport = (prop) => {
    if (baileysNS[prop] !== undefined) return baileysNS[prop];
    if (baileysNS.default && typeof baileysNS.default === 'object' && baileysNS.default[prop] !== undefined) {
        return baileysNS.default[prop];
    }
    return undefined;
};

// Resolve makeWASocket specifically as it can be the default export itself
const makeWASocket = (typeof baileysNS.default === 'function') 
    ? baileysNS.default 
    : (getBaileysExport('makeWASocket') || baileysNS.default);

const useMultiFileAuthState = getBaileysExport('useMultiFileAuthState');
const DisconnectReason = getBaileysExport('DisconnectReason');
const fetchLatestBaileysVersion = getBaileysExport('fetchLatestBaileysVersion');
const makeCacheableSignalKeyStore = getBaileysExport('makeCacheableSignalKeyStore');
const jidDecode = getBaileysExport('jidDecode');
const Browsers = getBaileysExport('Browsers');
const makeInMemoryStore = getBaileysExport('makeInMemoryStore');

export { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    jidDecode, 
    Browsers, 
    makeInMemoryStore 
};
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { startServer } from './lib/server.js';
import db from './lib/database.js';

// Global Error Handling
process.on('uncaughtException', (err) => {
    console.error('[SYSTEM] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[SYSTEM] Unhandled Rejection at:', promise, 'reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino({ level: 'silent' });
const plugins = new Map();

const store = makeInMemoryStore({ logger });
const storePath = './database/store.json';

try {
    if (fs.existsSync(storePath)) {
        store.readFromFile(storePath);
        console.log('[SYSTEM] Store loaded from file.');
    } else {
        console.log('[SYSTEM] No existing store found, starting fresh.');
    }
} catch (e) {
    console.error('[SYSTEM] Error reading store from file:', e);
}

setInterval(() => {
    try {
        if (!fs.existsSync(path.dirname(storePath))) {
            fs.mkdirSync(path.dirname(storePath), { recursive: true });
        }
        store.writeToFile(storePath);
    } catch (e) {
        console.error('[SYSTEM] Error writing store to file:', e);
    }
}, 10000);

export let currentSock = null;
let currentQR = null;

// Load Plugins
async function loadPlugins() {
    console.log('[BOT] Loading plugins...');
    const pluginFolder = path.join(__dirname, 'bot', 'plugins');
    if (!fs.existsSync(pluginFolder)) {
        fs.mkdirSync(pluginFolder, { recursive: true });
    }

    const files = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'));
    for (const file of files) {
        try {
            const plugin = await import(`./bot/plugins/${file}`);
            if (plugin.default && plugin.default.name) {
                plugins.set(plugin.default.name, plugin.default);
                console.log(`[BOT] Loaded plugin: ${plugin.default.name}`);
            }
        } catch (e) {
            console.error(`[BOT] Error loading plugin ${file}:`, e);
        }
    }
    console.log(`[BOT] Successfully loaded ${plugins.size} plugins.`);
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
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

    if (!sock.authState.creds.registered) {
        const phoneNumber = (process.env.BOT_NUMBER || '256706106326').replace(/\D/g, '');
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                console.log(`[BOT] Pair Code: ${code}`);
            } catch (e) {
                console.error('[BOT] Error requesting pairing code:', e);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) currentQR = qr;

        if (connection === 'close') {
            currentQR = null;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[BOT] Connection closed (Reason: ${statusCode}). Reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            currentQR = null;
            console.log('[BOT] JAMZ-MD Connected!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;

        // Anti-Delete logic
        if (msg.message.protocolMessage && msg.message.protocolMessage.type === 3) {
            const key = msg.message.protocolMessage.key;
            
            const database = db.get();
            const isAntiDeleteEnabled = database.groups[from]?.antidelete || database.settings.antidelete;
            
            if (isAntiDeleteEnabled) {
                try {
                    const deletedMsg = await store.loadMessage(from, key.id);
                    if (deletedMsg && deletedMsg.message) {
                        const participant = deletedMsg.key.participant || deletedMsg.key.remoteJid;
                        await sock.sendMessage(from, { 
                            text: `🛡️ *JAMZ-MD ANTI-DELETE*\n\n*From:* @${participant.split('@')[0]}\n*Time:* ${new Date().toLocaleString()}`,
                            mentions: [participant]
                        });
                        await sock.sendMessage(from, { forward: deletedMsg }, { quoted: deletedMsg });
                    }
                } catch (e) {
                    console.error('Anti-Delete Error:', e);
                }
            }
        }

        // Sender & Owner Detection
        const botId = sock.user?.id ? (jidDecode(sock.user.id)?.user + '@s.whatsapp.net') : null;
        const ownerNumber = (process.env.BOT_OWNER_WA_ID || '256706106326').replace(/\D/g, '');
        
        const sender = msg.key.fromMe ? botId : (msg.key.participant || msg.key.remoteJid);
        const isOwner = (sender && sender.split('@')[0] === ownerNumber) || (botId && botId.split('@')[0] === ownerNumber);

        // Bypass fromMe for Owner
        if (msg.key.fromMe && !isOwner) {
            console.log(`[MSG] Ignored: fromMe and not owner (${msg.key.id})`);
            return;
        }

        // Comprehensive Unwrapping
        const unwrap = (m) => {
            if (!m) return m;
            if (m.ephemeralMessage) return unwrap(m.ephemeralMessage.message);
            if (m.viewOnceMessage) return unwrap(m.viewOnceMessage.message);
            if (m.viewOnceMessageV2) return unwrap(m.viewOnceMessageV2.message);
            if (m.viewOnceMessageV2Extension) return unwrap(m.viewOnceMessageV2Extension.message);
            if (m.documentWithCaptionMessage) return unwrap(m.documentWithCaptionMessage.message);
            return m;
        };
        msg.message = unwrap(msg.message);

        let body = (
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            msg.message?.buttonsResponseMessage?.selectedButtonId ||
            msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.message?.templateButtonReplyMessage?.selectedId ||
            msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
            msg.message?.documentMessage?.caption ||
            ''
        );
        // Handle interactive JSON if applicable
        if (body && body.includes('"id":')) {
            try { body = JSON.parse(body).id; } catch {}
        }

        const messageType = Object.keys(msg.message)[0] || 'unknown';
        console.log(`[MSG] From: ${sender} | Type: ${messageType} | Body: ${body.slice(0, 50).replace(/\n/g, ' ')}`);
        
        const prefixes = ['.', '/', '🫠', '#'];
        const prefix = prefixes.find(p => body.startsWith(p));
        
        if (!prefix) {
            const database = db.get();
            const isAIOn = database.groups[from]?.aion || database.settings.aion;
            if (isAIOn && body && !msg.key.fromMe) {
                const gptPlugin = plugins.get('gpt');
                if (gptPlugin) {
                    await gptPlugin.execute(sock, msg, { args: body.split(/ +/), body, text: body, prefix: '', commandName: 'gpt', isOwner, plugins });
                }
            }
            return;
        }

        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const text = args.join(' ');
        
        const command = plugins.get(commandName) || 
                        Array.from(plugins.values()).find(p => p.alias && p.alias.includes(commandName));

        if (command) {
            console.log(`[CMD] Executing: ${commandName} for ${sender}`);
            try {
                await command.execute(sock, msg, { args, body, text, prefix, commandName, isOwner, plugins });
            } catch (e) {
                console.error(`Error executing command ${commandName}:`, e);
                await sock.sendMessage(from, { text: 'An error occurred while executing the command.' }, { quoted: msg });
            }
        } else {
            console.log(`[CMD] Command not found: ${commandName}`);
        }
    });

    return sock;
}

async function main() {
    try {
        await loadPlugins();
        await startBot();
        startServer(() => ({ sock: currentSock, qr: currentQR }));
    } catch (e) {
        console.error('[SYSTEM] Critical error during startup:', e);
        process.exit(1);
    }
}

main();
