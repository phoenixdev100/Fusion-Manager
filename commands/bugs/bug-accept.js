import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { getBugReportByMessageId, updateBugStatus } from '../../database/models/bug.js';
import roles from '../../config/roles.json' with { type: 'json' };

export default {
  name: 'bug-accept',
  data: new SlashCommandBuilder()
    .setName('bug-accept')
    .setDescription('Accept a bug report')
    .addStringOption(option => option.setName('msg_id').setDescription('Message ID of the bug report').setRequired(true)),
  async execute(interaction) {
    const hasPermission = (roles.MANAGER_ROLE && interaction.member.roles.cache.has(roles.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to accept bug reports.', 
        ephemeral: true 
      });
    }
    
    const messageId = interaction.options.getString('msg_id');
    
    try {
      const bugReport = await getBugReportByMessageId(messageId);
      
      if (!bugReport) {
        return interaction.reply({
          content: 'Bug report not found. Please check the message ID.',
          ephemeral: true
        });
      }
      
      if (bugReport.status !== 'pending' && bugReport.status !== 'declined') {
        return interaction.reply({
          content: `This bug report has already been ${bugReport.status} and cannot be changed.`,
          ephemeral: true
        });
      }
      
      await updateBugStatus(messageId, 'accepted', interaction.user.id);
      
      try {
        const channel = await interaction.client.channels.fetch(bugReport.channel_id);
        const message = await channel.messages.fetch(messageId);
        
        const botReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(interaction.client.user.id));
        for (const reaction of botReactions.values()) {
          await reaction.remove();
        }
        
        await message.react('✅');
        
        const acceptReply = await message.reply({
          embeds: [{
            title: '✅ Bug Report Accepted',
            description: 'This bug report has been accepted and will be addressed.',
            color: 0x00FF00
          }]
        });
        
        setTimeout(() => {
          acceptReply.delete().catch(err => console.error('Error deleting acceptance message:', err));
        }, 3000);
      } catch (err) {
        console.error('Error updating original bug report message:', err);
      }
      
      return interaction.reply({
        content: `Bug report ${messageId} has been accepted.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error accepting bug report:', error);
      return interaction.reply({
        content: `Failed to accept bug report: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
