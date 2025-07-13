import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';

export default {
  name: 'purge',
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages at once')
    .addIntegerOption(option => 
      option.setName('count')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User whose messages to delete (optional)')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ 
        content: 'You do not have permission to manage messages.', 
        ephemeral: true 
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ 
        content: 'I do not have permission to manage messages in this channel.', 
        ephemeral: true 
      });
    }

    const count = interaction.options.getInteger('count');
    const user = interaction.options.getUser('user');

    try {
      await interaction.deferReply({ ephemeral: true });

      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      let messagesToDelete = messages;

      if (user) {
        messagesToDelete = messages.filter(msg => msg.author.id === user.id);
      }

      messagesToDelete = Array.from(messagesToDelete.values()).slice(0, count);

      if (messagesToDelete.length === 1) {
        await messagesToDelete[0].delete();
      } else if (messagesToDelete.length > 1) {
        await interaction.channel.bulkDelete(messagesToDelete, true);
      } else {
        return interaction.followUp({ 
          content: 'No messages found to delete.', 
          ephemeral: true 
        });
      }

      const userMention = user ? ` from ${user.tag}` : '';
      await interaction.followUp({ 
        content: `Successfully deleted ${messagesToDelete.length} message(s)${userMention}.`,
        ephemeral: true 
      });

    } catch (error) {
      console.error('Error purging messages:', error);
      await interaction.followUp({ 
        content: 'An error occurred while trying to purge messages. Make sure the messages are not older than 14 days.', 
        ephemeral: true 
      });
    }
  }
};
