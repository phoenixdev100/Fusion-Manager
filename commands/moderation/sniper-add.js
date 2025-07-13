import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import roles from '../../config/roles.json' with { type: 'json' };

export default {
  name: 'sniper-add',
  data: new SlashCommandBuilder()
    .setName('sniper')
    .setDescription('Sniper management commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a user to the sniper list')
        .addStringOption(option =>
          option.setName('username')
            .setDescription('The username to add to the sniper list')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for adding to the sniper list')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const hasPermission = roles.STAFF_ROLE.some(role => interaction.member.roles.cache.has(role)) || 
                         interaction.member.roles.cache.has(roles.MANAGER_ROLE);    
    if (!hasPermission) {
      return interaction.reply({ 
        content: '❌ You do not have permission to use this command.', 
        ephemeral: true 
      });
    }

    const username = interaction.options.getString('username');
    const reason = interaction.options.getString('reason');
    const moderator = interaction.user;

    try {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚨 Sniper Added')
        .setDescription(`A new user has been added to the sniper list.`)
        .addFields(
          { name: 'Username', value: username, inline: true },
          { name: 'Moderator', value: moderator.tag, inline: true },
          { name: 'Reason', value: reason, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: 'Fusion Manager | Sniper System' });

      const channelId = '899659621097152563';
      const channel = await interaction.client.channels.fetch(channelId);
      
      if (!channel) {
        return interaction.reply({
          content: '❌ Could not find the sniper log channel.',
          ephemeral: true
        });
      }

      await channel.send({ embeds: [embed] });
      
      await interaction.reply({
        content: `✅ Successfully added ${username} to the sniper list.`,
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error in sniper add command:', error);
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    }
  },
};
