import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getTradesByStatus } from '../../database/models/trade.js';
import roles from '../../config/roles.json' with { type: 'json' };

export default {
  name: 'trade-list',
  data: new SlashCommandBuilder()
    .setName('trade-list')
    .setDescription('List all pending trade requests'),

  async execute(interaction) {
    const hasPermission = (roles.MANAGER_ROLE && interaction.member.roles.cache.has(roles.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to view trade requests.', 
        ephemeral: true 
      });
    }
    
    try {
      const pendingTrades = await getTradesByStatus('pending');
      
      if (pendingTrades.length === 0) {
        return interaction.reply({
          content: 'There are no pending trade requests.',
          ephemeral: true
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🔄 Pending Trade Requests')
        .setColor(0x3498DB)
        .setDescription(`Found ${pendingTrades.length} pending trade requests.`);
      
      const fields = [];
      
      for (const trade of pendingTrades) {
        fields.push({
          name: `Trade #${trade.id}`,
          value: [
            `**Looking for:** ${trade.looking_for}`,
            `**Offering:** ${trade.offering}`,
            `**Requested by:** <@${trade.user_id}>`,
            `[Jump to message](https://discord.com/channels/${interaction.guild.id}/${trade.channel_id}/${trade.message_id})`,
            `\`/trade-accept msg_id:${trade.message_id}\``
          ].join('\n'),
          inline: true
        });
      }
      
      const chunks = [];
      for (let i = 0; i < fields.length; i += 24) {
        chunks.push(fields.slice(i, i + 24));
      }
      
      const firstChunk = chunks.shift();
      embed.setFields(firstChunk);
      
      const message = await interaction.reply({
        embeds: [embed],
        fetchReply: true,
        ephemeral: true
      });
      
      for (const chunk of chunks) {
        const chunkEmbed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setFields(chunk);
          
        await interaction.followUp({
          embeds: [chunkEmbed],
          ephemeral: true
        });
      }
      
    } catch (error) {
      console.error('Error listing trade requests:', error);
      return interaction.reply({
        content: `Failed to list trade requests: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
