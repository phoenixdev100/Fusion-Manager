import { getBugReportChannel, getSuggestionChannel } from '../../database/models/guild.js';
import { getTradeChannel } from '../../database/models/trade.js';
import { handleBugReport } from './bug/bugCreate.js';
import { handleSuggestion } from './suggestion/suggestionCreate.js';
import { handleTradeRequest } from './trade/tradeCreate.js';

export default {
  once: false,
  async execute(client, message) {
    if (message.author.bot) return;
    
    try {
      const reportChannelId = await getBugReportChannel(message.guild.id);
      const suggestionChannelId = await getSuggestionChannel(message.guild.id);
      const tradeChannelId = await getTradeChannel(message.guild.id);
      
      if (message.channel.id === reportChannelId) {
        await handleBugReport(message);
      }
      else if (message.channel.id === suggestionChannelId) {
        await handleSuggestion(message);
      }
      else if (message.channel.id === tradeChannelId) {
        await handleTradeRequest(message);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }
};
