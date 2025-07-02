import { handleButtonInteraction } from './buttonHandler.js';

export async function handleInteraction(client, interaction) {
  if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
    return;
  }
  if (!interaction.isCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    const errorMessage = { 
      content: 'There was an error executing this command!', 
      ephemeral: true 
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
