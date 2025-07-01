import { handleSuggestionButton } from './buttons/suggestionButton.js';
import { handleTradeButton } from './buttons/tradeButton.js';

export async function handleButtonInteraction(interaction) {
  if (!interaction.isButton()) {
    return;
  }
  
  try {
    if (interaction.customId.startsWith('suggestion_')) {
      return await handleSuggestionButton(interaction);
    }
    
    if (interaction.customId.startsWith('accept_trade_') || 
        interaction.customId.startsWith('confirm_trade_') || 
        interaction.customId.startsWith('reject_trade_') ||
        interaction.customId.startsWith('counter_offer_') ||
        interaction.customId.startsWith('confirm_counter_') ||
        interaction.customId.startsWith('reject_counter_')) {
      console.log('Routing to trade button handler');
      return await handleTradeButton(interaction);
    }
    
    console.log('No handler found for button:', interaction.customId);
  } catch (error) {
    console.error('Error in button handler:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      }).catch(console.error);
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ An error occurred while processing your request. Please try again later.'
      }).catch(console.error);
    }
  }
}
