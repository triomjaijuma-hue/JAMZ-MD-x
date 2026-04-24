import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = path.join(__dirname, '../bot/plugins');

export const plugins = new Map();

/**
 * Loads all plugins from the bot/plugins directory
 */
export const loadPlugins = async () => {
    console.log(chalk.cyan('[LOADER] Initializing plugins...'));
    
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
    }

    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    
    plugins.clear();

    for (const file of files) {
        try {
            const filePath = path.join(pluginsDir, file);
            // Use cache busting for hot-reloading if needed
            const pluginModule = await import(`file://${filePath}?t=${Date.now()}`);
            const plugin = pluginModule.default;

            if (plugin && plugin.name && typeof plugin.execute === 'function') {
                plugins.set(plugin.name, plugin);
            } else {
                console.warn(chalk.yellow(`[LOADER] Skipping ${file}: Missing name or execute function.`));
            }
        } catch (error) {
            console.error(chalk.red(`[LOADER] Critical error in ${file}:`), error);
        }
    }
    
    console.log(chalk.green(`[LOADER] Active Plugins: ${plugins.size}`));
};

/**
 * Reloads a specific plugin file
 */
export const reloadPlugin = async (fileName) => {
    const filePath = path.join(pluginsDir, fileName);
    if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`[LOADER] Cannot reload: ${fileName} not found.`));
        return false;
    }
    
    try {
        const pluginModule = await import(`file://${filePath}?t=${Date.now()}`);
        const plugin = pluginModule.default;
        
        if (plugin && plugin.name && typeof plugin.execute === 'function') {
            plugins.set(plugin.name, plugin);
            console.log(chalk.green(`[LOADER] Reloaded: ${fileName}`));
            return true;
        }
    } catch (error) {
        console.error(chalk.red(`[LOADER] Reload error (${fileName}):`), error);
    }
    return false;
};
