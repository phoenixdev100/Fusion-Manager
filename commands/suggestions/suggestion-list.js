import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { getSuggestionsByStatus } from '../../database/models/suggestion.js';
import { getSuggestionChannel } from '../../database/models/guild.js';
import roles from '../../config/roles.json' with { type: 'json' };
import { error } from '../../utils/logger.js';

export default {
  name: 'suggestion-list',
  data: new SlashCommandBuilder()
    .setName('suggestion-list')
    .setDescription('List all suggestions with a specific status')
    .addStringOption(option => 
      option.setName('type')
        .setDescription('Type of suggestions to list')
        .setRequired(true)
        .addChoices(
          { name: 'Accepted', value: 'accepted' },
          { name: 'Declined', value: 'declined' },
          { name: 'Pending', value: 'pending' }
        )
    ),
  async execute(interaction) {
    const hasPermission = (roles.MANAGER_ROLE && interaction.member.roles.cache.has(roles.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to list suggestions.', 
        ephemeral: true 
      });
    }
    
    const type = interaction.options.getString('type');
    
    try {
      const suggestionChannelId = await getSuggestionChannel(interaction.guild.id);
      
      if (!suggestionChannelId) {
        return interaction.reply({
          content: 'Suggestion system is not set up. Please run /suggestion-system first.',
          ephemeral: true
        });
      }
      
      const suggestions = await getSuggestionsByStatus(type);
      
      if (suggestions.length === 0) {
        return interaction.reply({
          content: `No ${type} suggestions found.`,
          ephemeral: true
        });
      }
      
      const guildId = interaction.guild.id;
      const messageLinks = suggestions.map((suggestion, index) => {
        return `${index + 1}. [Suggestion #${suggestion.id}](https://discord.com/channels/${guildId}/${suggestion.channel_id}/${suggestion.message_id})`;
      });
      
      const chunks = [];
      for (let i = 0; i < messageLinks.length; i += 10) {
        chunks.push(messageLinks.slice(i, i + 10).join('\n'));
      }
      
      await interaction.reply({
        embeds: [{
          title: `List of ${type} suggestions`,
          description: chunks[0],
          color: type === 'accepted' ? 0x00FF00 : type === 'declined' ? 0xFF0000 : 0x4287f5,
          footer: {
            text: `Total: ${suggestions.length} ${type} suggestions | Page 1/${chunks.length}`
          },
          timestamp: new Date()
        }]
      });
      
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({
          embeds: [{
            title: `List of ${type} suggestions (continued)`,
            description: chunks[i],
            color: type === 'accepted' ? 0x00FF00 : type === 'declined' ? 0xFF0000 : 0x4287f5,
            footer: {
              text: `Total: ${suggestions.length} ${type} suggestions | Page ${i+1}/${chunks.length}`
            },
            timestamp: new Date()
          }]
        });
      }
    } catch (err) {
      error(`Error listing ${type} suggestions`, err);
      return interaction.reply({
        content: `Failed to list ${type} suggestions: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
