import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUserBugStats, getUserSuggestionStats } from '../../database/models/user.js';

export default {
  name: 'profile',
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View bug report and suggestion statistics for a user')
    .addUserOption(option => option.setName('user').setDescription('User to view profile for (defaults to yourself)')),
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      const bugStats = await getUserBugStats(targetUser.id);
      
      const bugTotalProcessed = bugStats.accepted + bugStats.declined;
      const bugAcceptanceRate = bugTotalProcessed > 0 
        ? Math.round((bugStats.accepted / bugTotalProcessed) * 100) 
        : 0;
      
      const suggestionStats = await getUserSuggestionStats(targetUser.id);
      
      const suggestionTotalProcessed = suggestionStats.accepted + suggestionStats.declined;
      const suggestionAcceptanceRate = suggestionTotalProcessed > 0 
        ? Math.round((suggestionStats.accepted / suggestionTotalProcessed) * 100) 
        : 0;
      
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Profile`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setColor(0x3498DB)
        .addFields(
          { name: '🐛 Bug Reports', value: '━━━━━━━━━━━━━', inline: false },
          { name: 'Total Reported', value: bugStats.total.toString(), inline: true },
          { name: 'Accepted', value: bugStats.accepted.toString(), inline: true },
          { name: 'Declined', value: bugStats.declined.toString(), inline: true },
          { name: 'Pending', value: bugStats.pending.toString(), inline: true },
          { name: 'Acceptance Rate', value: `${bugAcceptanceRate}%`, inline: true },
          { name: '\u200B', value: '\u200B', inline: false },
          { name: '💡 Suggestions', value: '━━━━━━━━━━━━━', inline: false },
          { name: 'Total Suggested', value: suggestionStats.total.toString(), inline: true },
          { name: 'Accepted', value: suggestionStats.accepted.toString(), inline: true },
          { name: 'Declined', value: suggestionStats.declined.toString(), inline: true },
          { name: 'Pending', value: suggestionStats.pending.toString(), inline: true },
          { name: 'Acceptance Rate', value: `${suggestionAcceptanceRate}%`, inline: true }
        )
        .setFooter({ text: `User ID: ${targetUser.id}` })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      await interaction.reply({ 
        content: 'An error occurred while fetching the user profile.', 
        ephemeral: true 
      });
    }
  }
};
