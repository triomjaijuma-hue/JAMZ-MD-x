import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidDecode,
    Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { startServer } from './lib/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino({ level: 'silent' });
const plugins = new Map();

let currentSock = null;
let currentQR = null;

// Load Plugins
async function loadPlugins() {
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
                console.log(`Loaded plugin: ${plugin.default.name}`);
            }
        } catch (e) {
            console.error(`Error loading plugin ${file}:`, e);
        }
    }
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

    if (!sock.authState.creds.registered) {
        const phoneNumber = (process.env.BOT_NUMBER || '256706106326').replace(/\D/g, '');
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            console.log(`Pair Code: ${code}`);
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) currentQR = qr;

        if (connection === 'close') {
            currentQR = null;
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            currentQR = null;
            console.log('JAMZ-MD Connected!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message) return;
        if (msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = (msg.message.conversation || 
                      msg.message.extendedTextMessage?.text || 
                      msg.message.imageMessage?.caption || 
                      msg.message.videoMessage?.caption || '') ;
        
        const prefixes = ['.', '/', '🫠', '#'];
        const prefix = prefixes.find(p => body.startsWith(p));
        if (!prefix) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = plugins.get(commandName) || 
                        Array.from(plugins.values()).find(p => p.alias && p.alias.includes(commandName));

        if (command) {
            try {
                const sender = msg.key.participant || msg.key.remoteJid;
                const isOwner = sender.split('@')[0] === (process.env.BOT_OWNER_WA_ID?.split('@')[0] || '256706106326');
                await command.execute(sock, msg, { args, body, prefix, commandName, isOwner, plugins });
            } catch (e) {
                console.error(`Error executing command ${commandName}:`, e);
                await sock.sendMessage(from, { text: 'An error occurred while executing the command.' }, { quoted: msg });
            }
        }
    });

    return sock;
}

loadPlugins().then(() => {
    startBot();
    startServer(() => ({ sock: currentSock, qr: currentQR }));
});
