import { addTrade } from '../../../database/models/trade.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { success } from '../../../utils/logger.js';
import { dbPromise } from '../../../database/connect.js';

export async function handleTradeRequest(message) {
  try {
    const content = message.content;
    
    const tradeChannelId = await getTradeChannel(message.guild.id);
    if (!tradeChannelId) {
      console.log('Trade channel not set up for this guild');
      return;
    }
    
    if (message.channel.id !== tradeChannelId) return;
    
    if (message.author.bot) return;
    
    const tradeMatch = content.match(/\[Trade\]\s*([^\n]+)/i);
    const offerMatch = content.match(/\[Item Offer\]\s*([^\n]+)/i);
    
    if (!tradeMatch || !offerMatch) {
      try {
        await message.delete();
      } catch (err) {
        console.error('Error deleting invalid trade request:', err);
      }
      
      const reminder = await message.channel.send({
        content: `<@${message.author.id}>`,
        embeds: [{
          title: '❌ Invalid Trade Request Format',
          description: 'Your trade request does not follow the required format. Please use the format below:',
          fields: [{
            name: 'Required Format',
            value: '```\n[Trade] What you\'re looking for\n[Item Offer] What you\'re offering\n```'
          }],
          color: 0xFF0000
        }]
      });
      
      setTimeout(() => {
        reminder.delete().catch(err => console.error('Error deleting reminder message:', err));
      }, 10000);
      
      return;
    }
    
    const lookingFor = tradeMatch[1].trim();
    const offering = offerMatch[1].trim();
    
    await message.delete().catch(console.error);
    
    const tradeEmbed = new EmbedBuilder()
      .setTitle('🔄 Trade Request')
      .setColor(0x3498DB)
      .addFields(
        { name: 'Looking For', value: lookingFor, inline: true },
        { name: 'Offering', value: offering, inline: true },
        { name: 'Status', value: '🟡 Pending', inline: true },
        { name: 'Offers', value: '0 pending', inline: true },
        { name: 'Requested by', value: `<@${message.author.id}>`, inline: false }
      )
      .setTimestamp();
    
    const attachment = message.attachments?.first();
    if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
      tradeEmbed.setImage(attachment.url);
    }
    
    const tempMessage = await message.channel.send({ 
      content: `Creating trade request...`,
      embeds: [tradeEmbed]
    });
    
    const tradeId = tempMessage.id;
    
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_trade_${tradeId}`)
          .setLabel('Accept Trade')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`counter_offer_${tradeId}`)
          .setLabel('Counter Offer')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔄')
      );
    
    tradeEmbed.setFooter({ 
      text: `Trade ID: ${tradeId} • Click the button below to accept this trade` 
    });
    
    await tempMessage.edit({ 
      content: `New trade request from <@${message.author.id}>`,
      embeds: [tradeEmbed],
      components: [actionRow]
    });
    
    await addTrade(
      tradeId,
      tempMessage.channel.id,
      message.author.id,
      lookingFor,
      offering
    );
    
    success(`New trade request from ${message.author.tag}: ${lookingFor} for ${offering}`);
    
  } catch (error) {
    console.error('Error processing trade request:', error);
    
    try {
      await message.channel.send({
        content: `<@${message.author.id}> An error occurred while processing your trade request. Please try again.`,
        ephemeral: true
      });
    } catch (err) {
      console.error('Error sending error notification:', err);
    }
  }
}

async function getTradeChannel(guildId) {
  try {
    const db = await dbPromise;
    const result = await db.get(
      'SELECT trade_channel_id FROM trade_settings WHERE guild_id = ?',
      [guildId]
    );
    return result?.trade_channel_id;
  } catch (err) {
    console.error('Error getting trade channel:', err);
    return null;
  }
}
