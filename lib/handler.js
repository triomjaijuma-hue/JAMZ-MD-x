import config from './config.js';
import { plugins } from './loader.js';
import db from './database.js';
import { decodeJid, getGroupAdmins, smsg } from './myfunc.js';
import chalk from 'chalk';
import { getContentType } from './baileys.js';

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

        // Anti-Delete logic
        if (m.mtype === 'protocolMessage' && m.msg && m.msg.type === 3) {
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

        const bodyText = typeof m.body === 'string' ? m.body : '';
        const type = m.mtype || 'unknown';

        // Prefix detection
        const prefix = config.prefixes.find(p => bodyText.startsWith(p)) || '';
        const isCmd = prefix !== '';
        const commandName = isCmd ? bodyText.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
        const args = isCmd ? bodyText.slice(prefix.length).trim().split(/ +/).slice(1) : bodyText.trim().split(/ +/);
        const text = args.join(' ');
        const itsMe = m.fromMe;
        const q = text;

        // Command Log
        if (isCmd) {
            console.log(chalk.black(chalk.bgWhite('[ CMD ]')), chalk.black(chalk.bgCyan(new Date().toLocaleString())), chalk.black(chalk.bgGreen(commandName)), chalk.magenta('from'), chalk.green(pushname), chalk.yellow(`(${sender})`), chalk.blue('in'), chalk.green(isGroup ? groupName : 'Private Chat'));
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

        if (isCmd) {
            const command = plugins.get(commandName) || 
                            Array.from(plugins.values()).find(p => p.alias && p.alias.includes(commandName));

            if (command) {
                try {
                    if (command.category === 'owner' && !isOwner) {
                        return m.reply('❌ This command is only for the bot owner.');
                    }
                    if (command.category === 'group' && !isGroup) {
                        return m.reply('❌ This command can only be used in groups.');
                    }
                    if (command.category === 'admin' && !isAdmins && !isOwner) {
                        return m.reply('❌ This command is only for group admins.');
                    }
                    if (command.category === 'botAdmin' && !isBotAdmins) {
                        return m.reply('❌ I need to be an admin to use this command.');
                    }
                    
                    await command.execute(sock, m, context);
                } catch (e) {
                    console.error(`[HANDLER] Error executing command ${commandName}:`, e);
                    m.reply('❌ An error occurred while executing the command.');
                }
            }
        } else {
            // AI/GPT Trigger or other non-command handling
            const isAIOn = database.groups[from]?.aion || database.settings.aion;
            if (isAIOn && bodyText && !m.fromMe && !isCmd) {
                const gptPlugin = plugins.get('gpt');
                if (gptPlugin) {
                    try {
                        await gptPlugin.execute(sock, m, { ...context, commandName: 'gpt' });
                    } catch (e) {
                        console.error('[HANDLER] AI Execution Error:', e);
                    }
                }
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
            console.log(chalk.red(`[CALL] From: ${c.from}`));
            await sock.rejectCall(c.id, c.from);
        }
    }
};

export const groupParticipantsHandler = async (sock, { id, participants, action }) => {
    console.log(chalk.blue(`[GROUP] ${id} Action: ${action} Participants: ${participants}`));
};
