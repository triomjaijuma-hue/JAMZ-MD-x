import { serialize, decodeJid } from './serialize.js';
import config from './config.js';
import { plugins } from './loader.js';
import db from './database.js';
import { getContentType } from './baileys.js';

export const handler = async (sock, m, store) => {
    try {
        if (!m) return;
        if (m.key && m.key.remoteJid === 'status@broadcast') return;
        
        // Anti-Delete logic
        if (m.message?.protocolMessage && m.message.protocolMessage.type === 3) {
            const key = m.message.protocolMessage.key;
            const database = db.get();
            const from = key.remoteJid;
            const isAntiDeleteEnabled = database.groups[from]?.antidelete || database.settings.antidelete;
            
            if (isAntiDeleteEnabled) {
                try {
                    const deletedMsg = await store.loadMessage(from, key.id);
                    if (deletedMsg && deletedMsg.message) {
                        const participant = decodeJid(deletedMsg.key.participant || deletedMsg.key.remoteJid);
                        await sock.sendMessage(from, { 
                            text: `🛡️ *JAMZ-MD ANTI-DELETE*\n\n*From:* @${participant.split('@')[0]}\n*Time:* ${new Date().toLocaleString()}`,
                            mentions: [participant]
                        });
                        await sock.sendMessage(from, { forward: deletedMsg }, { quoted: deletedMsg });
                    }
                } catch (e) {
                    console.error('[HANDLER] Anti-Delete Error:', e);
                }
            }
        }

        const msg = serialize(sock, m);
        if (!msg.message) return;

        const isOwner = config.ownerNumbers.includes(msg.sender.split('@')[0]) || msg.fromMe;
        
        // Sender log
        const type = msg.type || 'unknown';
        console.log(`[MSG] From: ${msg.sender} | Type: ${type} | Body: ${msg.body.slice(0, 50).replace(/\n/g, ' ')}`);

        // Prefix detection
        const prefix = config.prefixes.find(p => msg.body.startsWith(p));
        
        if (!prefix) {
            // AI/GPT Trigger
            const database = db.get();
            const isAIOn = database.groups[msg.chat]?.aion || database.settings.aion;
            if (isAIOn && msg.body && !msg.fromMe) {
                const gptPlugin = plugins.get('gpt');
                if (gptPlugin) {
                    try {
                        await gptPlugin.execute(sock, msg, { 
                            args: msg.body.split(/ +/), 
                            body: msg.body, 
                            text: msg.body, 
                            prefix: '', 
                            commandName: 'gpt', 
                            isOwner, 
                            plugins 
                        });
                    } catch (e) {
                        console.error('[HANDLER] AI Execution Error:', e);
                    }
                }
            }
            return;
        }

        const args = msg.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const text = args.join(' ');
        
        const command = plugins.get(commandName) || 
                        Array.from(plugins.values()).find(p => p.alias && p.alias.includes(commandName));

        if (command) {
            try {
                // Check for owner-only commands
                if (command.category === 'owner' && !isOwner) {
                    return msg.reply('❌ This command is only for the bot owner.');
                }
                
                await command.execute(sock, msg, { 
                    args, 
                    body: msg.body, 
                    text, 
                    prefix, 
                    commandName, 
                    isOwner, 
                    plugins 
                });
            } catch (e) {
                console.error(`[HANDLER] Error executing command ${commandName}:`, e);
                msg.reply('❌ An error occurred while executing the command.');
            }
        }
    } catch (error) {
        console.error('[HANDLER] Critical Error:', error);
    }
};
