import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { getSuggestionByMessageId, updateSuggestionStatus } from '../../database/models/suggestion.js';
import roles from '../../config/roles.json' with { type: 'json' };
import { success, error } from '../../utils/logger.js';

export default {
  name: 'suggestion-decline',
  data: new SlashCommandBuilder()
    .setName('suggestion-decline')
    .setDescription('Decline a suggestion')
    .addStringOption(option => option.setName('msg_id').setDescription('Message ID of the suggestion').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for declining the suggestion').setRequired(true)),
  async execute(interaction) {
    const hasPermission = (roles.MANAGER_ROLE && interaction.member.roles.cache.has(roles.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to decline suggestions.', 
        ephemeral: true 
      });
    }
    
    const messageId = interaction.options.getString('msg_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      const suggestion = await getSuggestionByMessageId(messageId);
      
      if (!suggestion) {
        return interaction.reply({
          content: 'Suggestion not found. Please check the message ID.',
          ephemeral: true
        });
      }
      
      if (suggestion.status !== 'pending' && suggestion.status !== 'accepted') {
        return interaction.reply({
          content: `This suggestion has already been ${suggestion.status} and cannot be changed.`,
          ephemeral: true
        });
      }
      
      await updateSuggestionStatus(messageId, 'declined', interaction.user.id, reason);
      
      try {
        const channel = await interaction.client.channels.fetch(suggestion.channel_id);
        const message = await channel.messages.fetch(messageId);
        
        const originalEmbed = message.embeds[0];
        
        const updatedEmbed = {
          title: originalEmbed.title,
          description: originalEmbed.description,
          fields: [
            ...(originalEmbed.fields || []),
            { name: 'Status', value: 'Declined', inline: true },
            { name: 'Declined by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason for Decline', value: reason }
          ],
          color: 0xFF0000,
          footer: {
            text: `Status: Declined by ${interaction.user.tag}`
          },
          timestamp: new Date()
        };
        
        await message.edit({ embeds: [updatedEmbed] });
        
        const declineMessage = await message.reply({
          embeds: [{
            title: '❌ Suggestion Declined',
            description: `This suggestion has been declined.`,
            fields: [
              {
                name: 'Reason',
                value: reason
              }
            ],
            color: 0xFF0000
          }]
        });
        
        setTimeout(() => {
          declineMessage.delete().catch(err => {
            error('Error deleting decline message', err);
          });
        }, 3000);
        
        success(`Suggestion ${messageId} declined by ${interaction.user.tag}`);
        return interaction.reply({
          content: `Suggestion ${messageId} has been declined with reason: ${reason}`,
          ephemeral: true
        });
      } catch (err) {
        error('Error updating suggestion message', err);
        return interaction.reply({
          content: `Failed to update the suggestion message: ${err.message}`,
          ephemeral: true
        });
      }
    } catch (err) {
      error('Error declining suggestion', err);
      return interaction.reply({
        content: `Failed to decline suggestion: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
