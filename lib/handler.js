import config from './config.js';
import { plugins } from './loader.js';
import db from './database.js';
import { decodeJid } from './myfunc.js';

export const handler = async (sock, m, store) => {
    try {
        if (!m) return;
        if (m.key && m.key.remoteJid === 'status@broadcast') return;
        
        // --- Pre-processing ---
        const database = db.get();
        const from = m.chat;
        const isGroup = m.isGroup;
        const sender = m.sender;
        const isOwner = config.ownerNumbers.includes(sender.split('@')[0]) || m.fromMe;
        
        // Anti-Delete logic
        if (m.mtype === 'protocolMessage' && m.msg.type === 3) {
            const key = m.msg.key;
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
                        await sock.copyNForward(from, deletedMsg, true);
                    }
                } catch (e) {
                    console.error('[HANDLER] Anti-Delete Error:', e);
                }
            }
        }

        if (!m.message) return;

        // Sender log
        const type = m.mtype || 'unknown';
        const bodyText = typeof m.body === 'string' ? m.body : '';
        console.log(`[MSG] From: ${sender} | Type: ${type} | Body: ${bodyText.slice(0, 50).replace(/\n/g, ' ')}`);

        // Prefix detection
        const prefix = config.prefixes.find(p => bodyText.startsWith(p));
        
        if (!prefix) {
            // AI/GPT Trigger
            const isAIOn = database.groups[from]?.aion || database.settings.aion;
            if (isAIOn && bodyText && !m.fromMe) {
                const gptPlugin = plugins.get('gpt');
                if (gptPlugin) {
                    try {
                        await gptPlugin.execute(sock, m, { 
                            args: bodyText.split(/ +/), 
                            body: bodyText, 
                            text: bodyText, 
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

        // --- Command Execution ---
        const args = bodyText.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const text = args.join(' ');
        
        const command = plugins.get(commandName) || 
                        Array.from(plugins.values()).find(p => p.alias && p.alias.includes(commandName));

        if (command) {
            try {
                // Check for owner-only commands
                if (command.category === 'owner' && !isOwner) {
                    return m.reply('❌ This command is only for the bot owner.');
                }
                
                await command.execute(sock, m, { 
                    args, 
                    body: bodyText, 
                    text, 
                    prefix, 
                    commandName, 
                    isOwner, 
                    plugins 
                });
            } catch (e) {
                console.error(`[HANDLER] Error executing command ${commandName}:`, e);
                m.reply('❌ An error occurred while executing the command.');
            }
        }
    } catch (error) {
        console.error('[HANDLER] Critical Error:', error);
    }
};

export const callHandler = async (sock, call) => {
    if (!config.antiCall) return;
    for (let c of call) {
        if (c.status === 'offer') {
            console.log(`[CALL] From: ${c.from}`);
            await sock.rejectCall(c.id, c.from);
        }
    }
};

export const groupParticipantsHandler = async (sock, { id, participants, action }) => {
    console.log(`[GROUP] ${id} Action: ${action} Participants: ${participants}`);
    // Handle Welcome/Goodbye here if needed
};
