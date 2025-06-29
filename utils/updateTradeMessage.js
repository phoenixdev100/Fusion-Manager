import { getTradeOffers } from '../database/models/trade.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function updateTradeMessage(message, trade) {
  try {
    if (!message || !message.editable || !trade) return;
    
    const pendingOffers = await getTradeOffers(trade.id, 'pending');
    const embed = message.embeds[0];
    
    if (!embed) return;
    
    const statusField = embed.fields?.find(f => f.name === 'Status');
    const statusText = trade.status === 'completed' ? '🔴 Closed' : '🟡 Pending';
    
    if (statusField) {
      statusField.value = statusText;
    } else if (embed.fields) {
      embed.fields.push({
        name: 'Status',
        value: statusText,
        inline: true
      });
    }
    
    const offersField = embed.fields?.find(f => f.name === 'Offers');
    const offersText = pendingOffers.length > 0 
      ? `${pendingOffers.length} pending` 
      : 'No offers yet';
    
    if (offersField) {
      offersField.value = offersText;
    } else if (embed.fields) {
      embed.fields.push({
        name: 'Offers',
        value: offersText,
        inline: true
      });
    }
    
    const isDisabled = trade.status !== 'pending';
    
    await message.edit({ 
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: ButtonStyle.Success,
              label: 'Accept Trade',
              custom_id: `accept_trade_${trade.message_id}`,
              disabled: isDisabled
            },
            {
              type: 2,
              style: ButtonStyle.Primary,
              label: 'Counter Offer',
              custom_id: `counter_offer_${trade.message_id}`,
              disabled: isDisabled
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error updating trade message:', error);
  }
}
