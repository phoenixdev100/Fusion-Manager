import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { getSuggestionByMessageId, updateSuggestionStatus } from '../../database/models/suggestion.js';
import roles from '../../config/roles.json' with { type: 'json' };
import { success, error } from '../../utils/logger.js';

export default {
  name: 'suggestion-accept',
  data: new SlashCommandBuilder()
    .setName('suggestion-accept')
    .setDescription('Accept a suggestion')
    .addStringOption(option => option.setName('msg_id').setDescription('Message ID of the suggestion').setRequired(true)),
  async execute(interaction) {
    const hasPermission = (roles.MANAGER_ROLE && interaction.member.roles.cache.has(roles.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to accept suggestions.', 
        ephemeral: true 
      });
    }
    
    const messageId = interaction.options.getString('msg_id');
    
    try {
      const suggestion = await getSuggestionByMessageId(messageId);
      
      if (!suggestion) {
        return interaction.reply({
          content: 'Suggestion not found. Please check the message ID.',
          ephemeral: true
        });
      }
      
      if (suggestion.status !== 'pending' && suggestion.status !== 'declined') {
        return interaction.reply({
          content: `This suggestion has already been ${suggestion.status} and cannot be changed.`,
          ephemeral: true
        });
      }
      
      await updateSuggestionStatus(messageId, 'accepted', interaction.user.id);
      
      try {
        const channel = await interaction.client.channels.fetch(suggestion.channel_id);
        const message = await channel.messages.fetch(messageId);
        
        const originalEmbed = message.embeds[0];
        
        const updatedEmbed = {
          title: originalEmbed.title,
          description: originalEmbed.description,
          fields: originalEmbed.fields || [],
          color: 0x00FF00,
          footer: {
            text: `Status: Accepted by ${interaction.user.tag}`
          },
          timestamp: new Date()
        };
        
        await message.edit({ embeds: [updatedEmbed] });
        
        const acceptMessage = await message.reply({
          embeds: [{
            title: '✅ Suggestion Accepted',
            description: 'This suggestion has been accepted and will be implemented.',
            color: 0x00FF00
          }]
        });
        
        setTimeout(() => {
          acceptMessage.delete().catch(err => {
            error('Error deleting acceptance message', err);
          });
        }, 3000);
        
        success(`Suggestion ${messageId} accepted by ${interaction.user.tag}`);
        return interaction.reply({
          content: `Suggestion ${messageId} has been accepted.`,
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
      error('Error accepting suggestion', err);
      return interaction.reply({
        content: `Failed to accept suggestion: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
