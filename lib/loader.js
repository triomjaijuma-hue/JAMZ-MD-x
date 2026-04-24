import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = path.join(__dirname, '../bot/plugins');

export const plugins = new Map();

export const loadPlugins = async () => {
    console.log('[LOADER] Loading plugins...');
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
    }

    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    
    for (const file of files) {
        const filePath = path.join(pluginsDir, file);
        try {
            // Using a timestamp to bypass ESM cache if needed (though usually not for initial load)
            const pluginModule = await import(`../bot/plugins/${file}?t=${Date.now()}`);
            const plugin = pluginModule.default;

            if (plugin && plugin.name && typeof plugin.execute === 'function') {
                plugins.set(plugin.name, plugin);
                // console.log(`[LOADER] Loaded: ${plugin.name}`);
            } else {
                console.warn(`[LOADER] Invalid plugin structure in ${file}`);
            }
        } catch (error) {
            console.error(`[LOADER] Failed to load plugin ${file}:`, error);
        }
    }
    
    console.log(`[LOADER] Successfully loaded ${plugins.size} plugins.`);
};
