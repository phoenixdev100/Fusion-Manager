import { PermissionsBitField, ChannelType, SlashCommandBuilder } from 'discord.js';
import { setTradeChannel } from '../../database/models/trade.js';
import roles from '../../config/roles.json' with { type: 'json' };
import { success, error } from '../../utils/logger.js';

export default {
  name: 'trade-setup',
  data: new SlashCommandBuilder()
    .setName('trade-setup')
    .setDescription('Set up a trade channel for users')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Existing channel to use for trades (optional)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) || 
                          (roles.MANAGER_ROLE && interaction.member.roles.cache.has(roles.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to set up the trade system.', 
        ephemeral: true 
      });
    }
    
    try {
      let channel = interaction.options.getChannel('channel');
      
      if (!channel) {
        channel = await interaction.guild.channels.create({
          name: 'trades',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.SendMessages],
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            {
              id: interaction.client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            }
          ]
        });
      }
      
      await setTradeChannel(interaction.guild.id, channel.id);
      
      await channel.send({
        embeds: [{
          title: '🔄 Trade Channel',
          description: 'Post your trade requests here using the following format:',
          fields: [{
            name: 'Format',
            value: '```\n[Trade] What you\'re looking for\n[Item Offer] What you\'re offering\n```',
            inline: false
          }],
          color: 0x00FF00
        }]
      });
      
      success(`Trade channel set to ${channel.name} in guild ${interaction.guild.name}`);
      return interaction.reply({
        content: `Trade channel has been set up: ${channel}`,
        ephemeral: true
      });
    } catch (err) {
      error('Error setting up trade channel', err);
      return interaction.reply({
        content: `Failed to set up trade system: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
