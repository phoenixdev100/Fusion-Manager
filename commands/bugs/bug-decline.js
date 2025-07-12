import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { getBugReportByMessageId, updateBugStatus } from '../../database/models/bug.js';
import roles from '../../config/roles.json' with { type: 'json' };

export default {
  name: 'bug-decline',
  data: new SlashCommandBuilder()
    .setName('bug-decline')
    .setDescription('Decline a bug report')
    .addStringOption(option => option.setName('msg_id').setDescription('Message ID of the bug report').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for declining the bug report').setRequired(true)),
  async execute(interaction) {
    const hasPermission = (roles.MANAGER_ROLE && interaction.member.roles.cache.has(roles.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to decline bug reports.', 
        ephemeral: true 
      });
    }
    
    const messageId = interaction.options.getString('msg_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      const bugReport = await getBugReportByMessageId(messageId);
      
      if (!bugReport) {
        return interaction.reply({
          content: 'Bug report not found. Please check the message ID.',
          ephemeral: true
        });
      }
      
      if (bugReport.status !== 'pending' && bugReport.status !== 'accepted') {
        return interaction.reply({
          content: `This bug report has already been ${bugReport.status} and cannot be changed.`,
          ephemeral: true
        });
      }
      
      await updateBugStatus(messageId, 'declined', interaction.user.id, reason);
      
      try {
        const channel = await interaction.client.channels.fetch(bugReport.channel_id);
        const message = await channel.messages.fetch(messageId);
        
        const botReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(interaction.client.user.id));
        for (const reaction of botReactions.values()) {
          await reaction.remove();
        }
        
        await message.react('❌');
        
        const declineReply = await message.reply({
          embeds: [{
            title: '❌ Bug Report Declined',
            description: `This bug report has been declined.`,
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
          declineReply.delete().catch(err => console.error('Error deleting decline message:', err));
        }, 3000);
      } catch (err) {
        console.error('Error updating original bug report message:', err);
      }
      
      return interaction.reply({
        content: `Bug report ${messageId} has been declined with reason: ${reason}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error declining bug report:', error);
      return interaction.reply({
        content: `Failed to decline bug report: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
