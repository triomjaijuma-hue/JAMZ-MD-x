import config from './config.js';
import { plugins } from './loader.js';
import db from './database.js';
import { decodeJid, getGroupAdmins, smsg } from './myfunc.js';
import chalk from 'chalk';
import { getContentType } from './baileys.js';

/**
 * Main Message Handler
 */
export const handler = async (sock, m, store) => {
    try {
        if (!m) return;
        if (m.key && m.key.remoteJid === 'status@broadcast') return;
        
        const database = db.get();
        const from = m.chat;
        const isGroup = m.isGroup;
        const sender = m.sender;
        const pushname = m.pushName || 'No Name';
        const isOwner = config.ownerNumbers.includes(sender.split('@')[0]) || m.fromMe;
        
        let groupMetadata = isGroup ? await sock.groupMetadata(from).catch(e => {}) : '';
        let groupName = isGroup ? (groupMetadata ? groupMetadata.subject : '') : '';
        let participants = isGroup ? (groupMetadata ? groupMetadata.participants : []) : [];
        let groupAdmins = isGroup ? getGroupAdmins(participants) : [];
        let isBotAdmins = isGroup ? groupAdmins.includes(decodeJid(sock.user?.id)) : false;
        let isAdmins = isGroup ? groupAdmins.includes(sender) : false;

        // Anti-Delete Logic (MEGA-MD implementation)
        if (m.mtype === 'protocolMessage' && m.msg && m.msg.type === 3) {
            const key = m.msg.key;
            const isAntiDeleteEnabled = database.groups?.[from]?.antidelete || database.settings?.antidelete;
            
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

        const bodyText = typeof m.body === 'string' ? m.body : '';
        const type = m.mtype || 'unknown';

        // Prefix detection & Command Parsing
        const prefix = config.prefixes.find(p => bodyText.startsWith(p)) || '';
        const isCmd = prefix !== '';
        const commandName = isCmd ? bodyText.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
        const args = isCmd ? bodyText.slice(prefix.length).trim().split(/ +/).slice(1) : bodyText.trim().split(/ +/);
        const text = args.join(' ');
        const itsMe = m.fromMe;
        const q = text;

        // Logging
        if (isCmd) {
            console.log(
                chalk.bgCyan.black(' CMD '),
                chalk.cyan(new Date().toLocaleTimeString()),
                chalk.green(commandName),
                chalk.gray('from'),
                chalk.yellow(pushname),
                chalk.gray('in'),
                chalk.blue(isGroup ? 'Group' : 'Private')
            );
        }

        const context = {
            sock,
            m,
            args,
            body: bodyText,
            text,
            prefix,
            commandName,
            isOwner,
            isGroup,
            sender,
            pushname,
            groupMetadata,
            groupName,
            participants,
            groupAdmins,
            isBotAdmins,
            isAdmins,
            plugins,
            database,
            store,
            itsMe,
            q,
            from
        };

        // Command Execution
        if (isCmd) {
            const command = plugins.get(commandName) || 
                            Array.from(plugins.values()).find(p => p.alias && p.alias.includes(commandName));

            if (command) {
                // Permissions Checks
                if (command.category === 'owner' && !isOwner) {
                    return m.reply('❌ *ACCESS DENIED*: Owner Only Command.');
                }
                if (command.category === 'group' && !isGroup) {
                    return m.reply('❌ *ACCESS DENIED*: Group Only Command.');
                }
                if (command.category === 'admin' && !isAdmins && !isOwner) {
                    return m.reply('❌ *ACCESS DENIED*: Admin Only Command.');
                }
                if (command.category === 'botAdmin' && !isBotAdmins) {
                    return m.reply('❌ *ACCESS DENIED*: I need Admin privileges.');
                }
                
                try {
                    await command.execute(sock, m, context);
                } catch (e) {
                    console.error(`[HANDLER] Command Error (${commandName}):`, e);
                    m.reply(`❌ *ERROR*: ${e.message || 'Internal Server Error'}`);
                }
            }
        } else {
            // Automatic Responses (AI, etc.)
            const isAIOn = database.groups?.[from]?.aion || database.settings?.aion;
            if (isAIOn && bodyText && !m.fromMe && !isCmd && bodyText.length > 2) {
                const gptPlugin = plugins.get('gpt');
                if (gptPlugin) {
                    try {
                        await gptPlugin.execute(sock, m, { ...context, commandName: 'gpt' });
                    } catch (e) {}
                }
            }
        }
    } catch (error) {
        console.error('[HANDLER] Critical Message Error:', error);
    }
};

/**
 * Incoming Call Handler
 */
export const callHandler = async (sock, call) => {
    if (!config.antiCall) return;
    for (let c of call) {
        if (c.status === 'offer') {
            const caller = c.from;
            console.log(chalk.red(`[CALL] Blocking incoming call from: ${caller}`));
            await sock.rejectCall(c.id, caller);
            await sock.sendMessage(caller, { 
                text: '⚠️ *AUTO-BLOCK*: Calls are not allowed. Please text instead.' 
            });
        }
    }
};

/**
 * Group Participant Events Handler
 */
export const groupParticipantsHandler = async (sock, { id, participants, action }) => {
    const database = db.get();
    const isWelcomeOn = database.groups?.[id]?.welcome;
    
    if (isWelcomeOn) {
        for (let num of participants) {
            // Implementation of welcome/left messages could go here
            console.log(chalk.gray(`[GROUP-EVENT] ${id}: ${num} ${action}`));
        }
    }
};
