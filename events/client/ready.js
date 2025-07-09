import { Routes, REST } from 'discord.js';
import { initDatabase } from '../../database/connect.js';
import config from '../../config/config.json' with { type: 'json' };
import fs from 'fs';
import path from 'path';
import { load, success, info, error } from '../../utils/logger.js';

export default {
  once: true,
  async execute(client) {
    // no need to log here as i already logged in index.js
    try {
      info('Initializing database...');
      await initDatabase();
      
      info('Registering slash commands...');
      const commands = [];
      const commandFolders = fs.readdirSync(path.resolve('./commands'));
      
      for (const folder of commandFolders) {
        const folderPath = path.resolve(`./commands/${folder}`);
        if (!fs.statSync(folderPath).isDirectory()) continue;
        
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
          const command = await import(`../../commands/${folder}/${file}`);
          if (command.default && command.default.data) {
            commands.push(command.default.data);
          }
        }
      }
      
      const rest = new REST({ version: '10' }).setToken(config.TOKEN);
      
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      
      success(`Registered ${commands.length} slash commands`);
    } catch (err) {
      error('Failed during initialization', err);
    }
  }
};
