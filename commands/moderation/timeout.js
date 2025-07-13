import { PermissionsBitField } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
  name: 'timeout',
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user for a specified duration (in seconds)')
    .addUserOption(option => option.setName('user').setDescription('User to timeout').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 30s, 5m, 2h)').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for timeout').setRequired(false)),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'You do not have permission to timeout members.', ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration').toLowerCase();
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    const match = durationStr.match(/^(\d+)([smh]?)$/);
    if (!match) {
      return interaction.reply({ 
        content: 'Invalid duration format. Use format like: 30s, 5m, 2h', 
        ephemeral: true 
      });
    }
    
    const amount = parseInt(match[1]);
    const unit = match[2] || 's';
    
    let durationMs;
    switch (unit) {
      case 's':
        durationMs = amount * 1000;
        break;
      case 'm':
        durationMs = amount * 60 * 1000;
        break;
      case 'h':
        durationMs = amount * 60 * 60 * 1000;
        break;
      default:
        durationMs = amount * 1000;
    }
    
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    
    try {
      await member.timeout(durationMs, reason);
      
      let displayDuration = '';
      if (durationMs >= 3600000) {
        displayDuration = `${Math.floor(durationMs / 3600000)} hour${Math.floor(durationMs / 3600000) === 1 ? '' : 's'}`;
      } else if (durationMs >= 60000) {
        displayDuration = `${Math.floor(durationMs / 60000)} minute${Math.floor(durationMs / 60000) === 1 ? '' : 's'}`;
      } else {
        displayDuration = `${Math.floor(durationMs / 1000)} second${Math.floor(durationMs / 1000) === 1 ? '' : 's'}`;
      }
      
      interaction.reply({ 
        content: `${user.tag} has been timed out for ${displayDuration}.\nReason: ${reason}` 
      });
    } catch (err) {
      interaction.reply({ content: `Failed to timeout user: ${err.message}`, ephemeral: true });
    }
  }
};
