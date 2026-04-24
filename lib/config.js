import 'dotenv/config';

const config = {
    botName: process.env.BOT_NAME || 'JAMZ-MD',
    ownerNumbers: (process.env.OWNER_NUMBERS || '256706106326').split(',').map(num => num.replace(/\D/g, '')),
    prefixes: ['.', '/', '🫠', '#'],
    sessionPath: './session',
    storePath: './database/store.json',
    pairingNumber: (process.env.BOT_NUMBER || '256706106326').replace(/\D/g, ''),
    aiEnabled: process.env.AI_ENABLED === 'true' || true,
    antiDelete: process.env.ANTI_DELETE === 'true' || true,
    autoRead: process.env.AUTO_READ === 'true' || false,
    autoTyping: process.env.AUTO_TYPING === 'true' || false,
    alwaysOnline: process.env.ALWAYS_ONLINE === 'true' || true,
    antiCall: process.env.ANTI_CALL === 'true' || true,
    memoryLimit: parseInt(process.env.MEMORY_LIMIT || '480'), // In MB
    maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '5'),
};

export default config;
