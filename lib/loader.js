import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = path.join(__dirname, '../bot/plugins');

export const plugins = new Map();

export const loadPlugins = async () => {
    console.log(chalk.cyan('[LOADER] Loading plugins...'));
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
    }

    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    
    // Clear existing plugins before loading
    plugins.clear();

    for (const file of files) {
        try {
            const pluginModule = await import(`../bot/plugins/${file}?t=${Date.now()}`);
            const plugin = pluginModule.default;

            if (plugin && plugin.name && typeof plugin.execute === 'function') {
                plugins.set(plugin.name, plugin);
            } else {
                console.warn(chalk.yellow(`[LOADER] Invalid plugin structure in ${file}`));
            }
        } catch (error) {
            console.error(chalk.red(`[LOADER] Failed to load plugin ${file}:`), error);
        }
    }
    
    console.log(chalk.green(`[LOADER] Successfully loaded ${plugins.size} plugins.`));
};

export const reloadPlugin = async (fileName) => {
    const filePath = path.join(pluginsDir, fileName);
    if (!fs.existsSync(filePath)) return false;
    
    try {
        const pluginModule = await import(`../bot/plugins/${fileName}?t=${Date.now()}`);
        const plugin = pluginModule.default;
        
        if (plugin && plugin.name && typeof plugin.execute === 'function') {
            plugins.set(plugin.name, plugin);
            return true;
        }
    } catch (error) {
        console.error(chalk.red(`[LOADER] Failed to reload plugin ${fileName}:`), error);
    }
    return false;
};
