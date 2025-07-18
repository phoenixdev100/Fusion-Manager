import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { removeAdditionalUserFromStaffApplication } from '../../database/models/staffApplication.js';
import roles from '../../config/roles.json' with { type: 'json' };

export default {
  name: 'remove-user',
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from this staff application channel')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to remove from the staff application channel')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.member.roles.cache.has(roles.STAFF_APPLICATION_MANAGER_ROLE)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const channel = interaction.channel;
    if (!channel.name.startsWith('staff-app-')) {
      return interaction.reply({ content: 'This command can only be used in staff application channels.', ephemeral: true });
    }
    await channel.permissionOverwrites.edit(user.id, {
      ViewChannel: false,
      SendMessages: false
    });
    await removeAdditionalUserFromStaffApplication(channel.id, user.id);
    await interaction.reply({ content: `${user.tag} has been removed from this staff application channel.`, ephemeral: false });
  }
};
