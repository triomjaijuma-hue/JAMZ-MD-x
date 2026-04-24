import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database', 'db.json');

if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

let database = {
    settings: {},
    users: {},
    groups: {}
};

// Initial load
try {
    if (fs.existsSync(dbPath)) {
        const content = fs.readFileSync(dbPath, 'utf8');
        if (content) {
            database = JSON.parse(content);
        }
    } else {
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
    }
} catch (e) {
    console.error('[DATABASE] Error reading database on startup:', e);
}

let saveTimeout = null;
const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
            // console.log('[DATABASE] Saved to disk.');
        } catch (e) {
            console.error('[DATABASE] Error saving database:', e);
        }
    }, 10000); // Save after 10 seconds of inactivity
};

const db = {
    get: () => database,
    save: (data) => {
        database = data;
        debouncedSave();
    },
    update: (key, value) => {
        database[key] = value;
        debouncedSave();
    },
    getSetting: (name) => {
        return database.settings[name];
    },
    setSetting: (name, value) => {
        database.settings[name] = value;
        debouncedSave();
    },
    getGroupSetting: (jid, name) => {
        return database.groups[jid]?.[name];
    },
    setGroupSetting: (jid, name, value) => {
        if (!database.groups[jid]) database.groups[jid] = {};
        database.groups[jid][name] = value;
        debouncedSave();
    }
};

console.log('[DATABASE] Database system initialized with in-memory caching.');
export default db;
