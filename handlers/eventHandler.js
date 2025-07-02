import fs from 'fs';
import path from 'path';
import { load, debug, error } from '../utils/logger.js';

export async function loadEvents(client) {
  const eventFolders = ['client', 'message'];
  const buttonHandlersPath = path.resolve('./handlers/buttons');
  let loadedEvents = 0;
  
  for (const folder of eventFolders) {
    const folderPath = path.resolve(`./events/${folder}`);
    if (!fs.existsSync(folderPath)) continue;
    
    const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
      const event = await import(`../events/${folder}/${file}`);
      const eventName = file.split('.')[0];
      
      if (event.default && event.default.execute) {
        if (event.default.once) {
          client.once(eventName, (...args) => event.default.execute(client, ...args));
        } else {
          client.on(eventName, (...args) => event.default.execute(client, ...args));
        }
        loadedEvents++;
      }
    }
  }
  
  if (fs.existsSync(buttonHandlersPath)) {
    const buttonHandlerFiles = fs.readdirSync(buttonHandlersPath).filter(file => file.endsWith('.js'));
    
    for (const file of buttonHandlerFiles) {
      try {
        const buttonHandler = await import(`../handlers/buttons/${file}`);
        if (buttonHandler.default && buttonHandler.default.name && buttonHandler.default.execute) {
          client.on(buttonHandler.default.name, buttonHandler.default.execute);
          loadedEvents++;
        }
      } catch (err) {
        error(`Error loading button handler ${file}:`, err);
      }
    }
  }
  
  load(`Successfully loaded`, 'events:', loadedEvents);
}
