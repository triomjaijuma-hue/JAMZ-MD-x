import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database', 'db.json');

if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({
        settings: {},
        users: {},
        groups: {}
    }, null, 2));
}

const db = {
    get: () => {
        try {
            if (!fs.existsSync(dbPath)) return { settings: {}, users: {}, groups: {} };
            const content = fs.readFileSync(dbPath, 'utf8');
            if (!content) return { settings: {}, users: {}, groups: {} };
            return JSON.parse(content);
        } catch (e) {
            console.error('[DATABASE] Error reading database:', e);
            return { settings: {}, users: {}, groups: {} };
        }
    },
    save: (data) => {
        try {
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('[DATABASE] Error saving database:', e);
        }
    },
    update: (key, value) => {
        const data = db.get();
        data[key] = value;
        db.save(data);
    },
    getSetting: (name) => {
        const data = db.get();
        return data.settings[name];
    },
    setSetting: (name, value) => {
        const data = db.get();
        data.settings[name] = value;
        db.save(data);
    }
};

console.log('[DATABASE] Database system initialized.');
export default db;
