import { SlashCommandBuilder } from 'discord.js';

import roles from '../../config/roles.json' with { type: 'json' };

export default {
  name: 'staff-close',
  data: new SlashCommandBuilder()
    .setName('staff-close')
    .setDescription('Close this staff application channel'),
  async execute(interaction) {
    try {
      if (!interaction.member.roles.cache.has(roles.STAFF_APPLICATION_MANAGER_ROLE)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const channel = interaction.channel;
      if (!channel.name.startsWith('staff-app-')) {
        return interaction.reply({ content: 'This command can only be used in staff application channels.', ephemeral: true });
      }
      await interaction.reply({ content: 'This staff application channel will be closed in 5 seconds.', ephemeral: false });
      setTimeout(async () => {
        await channel.delete('Staff application closed by manager');
      }, 5000);
    } catch (err) {
      console.error('Error in /close:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'An error occurred while closing the channel.' });
      } else {
        await interaction.reply({ content: 'An error occurred while closing the channel.', ephemeral: true });
      }
    }
  }
};
