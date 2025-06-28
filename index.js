import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config/config.json' with { type: 'json' };
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { initDatabase } from './database/connect.js';
import { info, error, success } from './utils/logger.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

async function init() {
  try {
    info('Starting bot initialization...');
    await initDatabase();
    
    try {
      info('Loading commands...');
      const commands = await loadCommands(client);
      success(`Commands loaded successfully`);
    } catch (cmdErr) {
      error('Error loading commands', cmdErr);
      throw cmdErr;
    }
    
    try {
      info('Loading events...');
      await loadEvents(client);
      success('Events loaded successfully');
    } catch (evtErr) {
      error('Error loading events', evtErr);
      throw evtErr;
    }
    
    try {
      info('Logging in to Discord...');
      // debug('Using token: ' + (config.TOKEN ? 'Token exists' : 'Token is missing'));
      await client.login(config.TOKEN);
      success(`Logged in successfully as ${client.user.tag}`);
    } catch (loginErr) {
      error('Error logging in to Discord', loginErr);
      throw loginErr;
    }
    
    success('Bot initialization completed successfully');
  } catch (err) {
    error('Error during bot initialization', err);
    process.exit(1);
  }
}

init();
