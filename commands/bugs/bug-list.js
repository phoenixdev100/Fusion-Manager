import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { getBugReportsByStatus } from '../../database/models/bug.js';
import { getBugReportChannel } from '../../database/models/guild.js';
import roles from '../../config/roles.json' with { type: 'json' };

export default {
  name: 'bug-list',
  data: new SlashCommandBuilder()
    .setName('bug-list')
    .setDescription('List all bugs with a specific status')
    .addStringOption(option => 
      option.setName('type')
        .setDescription('Type of bugs to list')
        .setRequired(true)
        .addChoices(
          { name: 'Accepted', value: 'accepted' },
          { name: 'Declined', value: 'declined' }
        )
    ),
  async execute(interaction) {
    const hasPermission = (roles.MANAGER_ROLE && interaction.member.roles.cache.has(roles.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to list bug reports.', 
        ephemeral: true 
      });
    }
    
    const type = interaction.options.getString('type');
    
    if (type !== 'accepted' && type !== 'declined') {
      return interaction.reply({
        content: 'Invalid type. Please specify either "accepted" or "declined".',
        ephemeral: true
      });
    }
    
    try {
      const reportChannelId = await getBugReportChannel(interaction.guild.id);
      
      if (!reportChannelId) {
        return interaction.reply({
          content: 'Bug reporting system is not set up. Please run /bug-report first.',
          ephemeral: true
        });
      }
      
      const bugReports = await getBugReportsByStatus(type);
      
      if (bugReports.length === 0) {
        return interaction.reply({
          content: `No ${type} bug reports found.`,
          ephemeral: true
        });
      }
      
      const guildId = interaction.guild.id;
      const messageLinks = bugReports.map(report => {
        return `- https://discord.com/channels/${guildId}/${report.channel_id}/${report.message_id}`;
      });
      
      await interaction.reply({
        embeds: [{
          title: `List of ${type} bugs`,
          description: messageLinks.join('\n'),
          color: type === 'accepted' ? 0x00FF00 : 0xFF0000,
          footer: {
            text: `Total: ${bugReports.length} ${type} bug reports`
          },
          timestamp: new Date()
        }]
      });
    } catch (error) {
      console.error(`Error listing ${type} bug reports:`, error);
      return interaction.reply({
        content: `Failed to list ${type} bug reports: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
