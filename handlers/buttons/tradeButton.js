import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} from 'discord.js';
import { 
  getTradeByMessageId, 
  updateTradeStatus, 
  addTradeOffer, 
  getTradeOffers, 
  updateTradeOffer,
  addCounterOffer,
  getTradeById
} from '../../database/models/trade.js';
import { updateTradeMessage } from '../../utils/updateTradeMessage.js';

export async function handleTradeButton(interaction) {
  const { customId } = interaction;

  try {
    if (customId.startsWith('accept_trade_')) {
      await handleTradeAccept(interaction);
    }
    else if (customId.startsWith('confirm_trade_')) {
      await handleTradeConfirmation(interaction);
    }
    else if (customId.startsWith('reject_trade_')) {
      await handleTradeRejection(interaction);
    }
    else if (customId.startsWith('counter_offer_')) {
      await handleCounterOffer(interaction);
    }
    else if (customId.startsWith('confirm_counter_')) {
      await handleCounterOfferConfirmation(interaction);
    }
    else if (customId.startsWith('reject_counter_')) {
      await handleCounterOfferRejection(interaction);
    } else {
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ Unknown button action. Please try again.',
          ephemeral: true,
          flags: 1 << 6
        });
      }
    }
  } catch (error) {
    console.error('Error in handleTradeButton:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      });
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ An error occurred while processing your request. Please try again later.'
      });
    }
  }
}

async function handleTradeAccept(interaction) {
  const messageId = interaction.customId.replace('accept_trade_', '');
  
  try {
    const trade = await getTradeByMessageId(messageId);
    if (!trade) {
      return interaction.reply({
        content: 'Trade not found. It may have been deleted or already processed.',
        ephemeral: true
      });
    }

    if (interaction.user.id === trade.user_id) {
      return interaction.reply({
        content: 'You cannot accept your own trade.',
        ephemeral: true
      });
    }

    try {
      await addTradeOffer(trade.id, interaction.user.id, 'pending');
      
      try {
        const channel = await interaction.client.channels.fetch(trade.channel_id);
        if (!channel) {
          console.warn(`Channel ${trade.channel_id} not found`);
        } else {
          try {
            const message = await channel.messages.fetch(trade.message_id);
            if (message) {
              await updateTradeMessage(message, trade);
            }
          } catch (messageError) {
          }
        }
      } catch (channelError) {
      }
      
      try {
        const dmChannel = await interaction.client.users.createDM(trade.user_id);
        await dmChannel.send({
          content: `<@${interaction.user.id}> wants to accept your trade!`,
          embeds: [
            new EmbedBuilder()
              .setTitle('🔄 Trade Acceptance')
              .addFields(
                { name: 'Looking For', value: trade.looking_for || 'Not specified', inline: true },
                { name: 'Offering', value: trade.offering || 'Not specified', inline: true },
                { name: 'Accepted by', value: `<@${interaction.user.id}>`, inline: false },
                { 
                  name: 'Trade Link', 
                  value: `[Jump to Trade](https://discord.com/channels/${interaction.guild?.id || '@me'}/${trade.channel_id || 'DM'}/${trade.message_id || 'message'})`,
                  inline: false
                }
              )
              .setFooter({ text: `Trade ID: ${trade.id}` })
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`confirm_trade_${trade.message_id || '0'}_${interaction.user.id}`)
                .setLabel('Confirm Trade')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`reject_trade_${trade.message_id || '0'}_${interaction.user.id}`)
                .setLabel('Reject')
                .setStyle(ButtonStyle.Danger)
            )
          ]
        });

        await interaction.reply({
          content: 'Your trade offer has been sent to the trade creator!',
          ephemeral: true,
          flags: 1 << 6
        });
      } catch (dmError) {
        console.error('Error sending DM:', dmError);
        await interaction.reply({
          content: 'I was unable to send a DM to the trade creator. Please ask them to enable DMs from server members.',
          ephemeral: true,
          flags: 1 << 6
        });
      }
      
    } catch (error) {
      console.error('Error processing trade acceptance:', error);
      await interaction.reply({
        content: 'An error occurred while processing your trade acceptance. Please try again later.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error fetching trade:', error);
    await interaction.reply({
      content: 'An error occurred while fetching trade details. Please try again later.',
      ephemeral: true
    });
  }
}

async function handleTradeConfirmation(interaction) {
  const [_, messageId, userId] = interaction.customId.match(/confirm_trade_(\d+)_(\d+)/) || [];
  
  if (!messageId || !userId) {
    return interaction.reply({
      content: 'Invalid trade confirmation request.',
      ephemeral: true,
      flags: 1 << 6
    });
  }
  
  try {
    const trade = await getTradeByMessageId(messageId);
    if (!trade) {
      return interaction.reply({
        content: 'Trade not found. It may have been deleted or already processed.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    if (interaction.user.id !== trade.user_id) {
      return interaction.reply({
        content: 'Only the trade creator can confirm this trade.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    try {
      const updatedTrade = await updateTradeStatus(messageId, 'completed', interaction.user.id, 'Trade completed');
      
      if (!updatedTrade) {
        return interaction.reply({
          content: 'Failed to update trade status. Please try again.',
          ephemeral: true,
          flags: 1 << 6
        });
      }
      
      await updateTradeOffer(trade.id, userId, 'accepted');
      
      try {
        const channel = await interaction.client.channels.fetch(updatedTrade.channel_id).catch(() => null);
        if (channel) {
          channel.messages.fetch(updatedTrade.message_id)
            .then(message => updateTradeMessage(message, updatedTrade))
            .catch(() => {});
        }
      } catch (error) {
      }
    } catch (updateError) {
      console.error('Error updating trade status:', updateError);
    }
    
    try {
      const tradeAccepter = await interaction.client.users.fetch(userId);
      
      await interaction.reply({
        content: `✅ You have confirmed the trade with ${tradeAccepter.tag}!`,
        ephemeral: true,
        flags: 1 << 6
      });
      
      try {
        await tradeAccepter.send({
          content: `✅ <@${trade.user_id}> has confirmed your trade!`,
          embeds: [
            new EmbedBuilder()
              .setTitle('✅ Trade Confirmed')
              .addFields(
                { name: 'Looking For', value: trade.looking_for || 'Not specified', inline: true },
                { name: 'Offering', value: trade.offering || 'Not specified', inline: true },
                { 
                  name: 'Trade Link', 
                  value: `[Jump to Trade](https://discord.com/channels/${interaction.guild?.id || '@me'}/${trade.channel_id || 'DM'}/${trade.message_id || 'message'})`,
                  inline: false
                }
              )
              .setFooter({ text: `Trade ID: ${trade.id}` })
              .setTimestamp()
          ]
        });
      } catch (dmError) {
        console.error('Error sending DM to trade accepter:', dmError);
      }
      
    } catch (userError) {
      console.error('Error fetching user or sending confirmation:', userError);
      await interaction.reply({
        content: '✅ Trade confirmed, but there was an error notifying the other user.',
        ephemeral: true,
        flags: 1 << 6
      });
    }
    
  } catch (error) {
    console.error('Error confirming trade:', error);
    try {
      await interaction.reply({
        content: 'An error occurred while confirming the trade. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      });
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
  }
}

async function handleCounterOffer(interaction) {
  const messageId = interaction.customId.replace('counter_offer_', '');
  
  try {
    const trade = await getTradeByMessageId(messageId);
    if (!trade) {
      return interaction.reply({
        content: 'Trade not found. It may have been deleted or already processed.',
        flags: 1 << 6
      });
    }

    if (interaction.user.id === trade.user_id) {
      return interaction.reply({
        content: 'You cannot make a counter offer on your own trade.',
        flags: 1 << 6
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`counter_modal_${messageId}`)
      .setTitle('Make a Counter Offer');

    const counterOfferInput = new TextInputBuilder()
      .setCustomId('counter_offer')
      .setLabel('Your counter offer')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter your counter offer here...')
      .setRequired(true)
      .setMaxLength(1000);

    const firstActionRow = new ActionRowBuilder().addComponents(counterOfferInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);

    try {
      const modalResponse = await interaction.awaitModalSubmit({
        time: 60000,
        filter: i => i.customId === `counter_modal_${messageId}` && i.user.id === interaction.user.id,
      }).catch(error => {
        console.error('Error waiting for modal submission:', error);
        throw error;
      });

      const counterOffer = modalResponse.fields.getTextInputValue('counter_offer');
      
      try {
        await addCounterOffer(trade.id, interaction.user.id, counterOffer);
      } catch (dbError) {
        console.error('Database error when adding counter offer:', dbError);
        throw new Error('Failed to save counter offer to database');
      }
      
      const tradeCreator = await interaction.client.users.fetch(trade.user_id).catch(error => {
        throw new Error('Could not find the trade creator');
      });
      
      try {
        await modalResponse.deferReply({ ephemeral: true });
        const counterOfferMessage = {
          content: `🔄 New counter offer from <@${interaction.user.id}> for your trade:`,
          embeds: [
            new EmbedBuilder()
              .setTitle('🔄 Counter Offer Received')
              .addFields(
                { name: 'Your Original Offer', value: `**Looking For:** ${trade.looking_for}\n**Offering:** ${trade.offering}` },
                { name: 'Counter Offer', value: counterOffer, inline: false },
                { 
                  name: 'Trade Link', 
                  value: `[Jump to Original Trade](https://discord.com/channels/${interaction.guild?.id || '@me'}/${trade.channel_id || 'DM'}/${trade.message_id || 'message'})`,
                  inline: false 
                }
              )
              .setFooter({ text: `Trade ID: ${trade.id} • Counter Offer ID: ${Date.now()}` })
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`confirm_counter_${trade.id}_${interaction.user.id}`)
                .setLabel('Accept Counter Offer')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
              new ButtonBuilder()
                .setCustomId(`reject_counter_${trade.id}_${interaction.user.id}`)
                .setLabel('Reject Counter Offer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
            )
          ]
        };

        await tradeCreator.send(counterOfferMessage).catch(dmError => {
          console.error('Error sending DM:', dmError);
          throw new Error('DM_FAILED');
        });

        await modalResponse.editReply({
          content: '✅ Your counter offer has been sent to the trade creator!',
          flags: 1 << 6
        });
      } catch (dmError) {
        console.error('Error in DM process:', dmError);
        if (dmError.message === 'DM_FAILED') {
          await modalResponse.editReply({
            content: '⚠️ I was unable to send a DM to the trade creator. Please ask them to enable DMs from server members.',
            flags: 1 << 6
          });
        } else {
          throw dmError;
        }
      }
    } catch (modalError) {
      if (!interaction.replied) {
        interaction.followUp({ 
          content: 'Counter offer timed out or was cancelled.', 
          flags: 1 << 6
        }).catch(console.error);
      }
    }
  } catch (error) {
    console.error('Error handling counter offer:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while processing your counter offer. Please try again later.',
        flags: 1 << 6
      }).catch(console.error);
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: 'An error occurred while processing your counter offer. Please try again later.'
      }).catch(console.error);
    }
  }
}

async function handleCounterOfferConfirmation(interaction) {
  const match = interaction.customId.match(/confirm_counter_(\d+)_(\d+)/);
  
  if (!match) {
    console.error('Invalid customId format:', interaction.customId);
    return interaction.reply({
      content: '❌ Invalid counter offer confirmation request format.',
      ephemeral: true,
      flags: 1 << 6
    });
  }
  
  const [_, tradeId, userId] = match;
  
  if (!tradeId || !userId) {
    return interaction.reply({
      content: '❌ Invalid counter offer confirmation request. Missing required parameters.',
      ephemeral: true,
      flags: 1 << 6
    });
  }
  
  try {
    let trade = await getTradeByMessageId(tradeId);
    
    if (!trade) {
      trade = await getTradeById(parseInt(tradeId));
    }
    
    if (!trade) {
      return interaction.reply({
        content: 'Trade not found. It may have been deleted or already processed.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    if (interaction.user.id !== trade.user_id) {
      return interaction.reply({
        content: 'Only the trade creator can confirm this counter offer.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    try {
      let updatedTrade = await updateTradeStatus(trade.message_id || tradeId, 'completed', interaction.user.id, 'Counter offer accepted');
      
      if (!updatedTrade) {
        const tradeById = await getTradeById(parseInt(tradeId));
        if (tradeById && tradeById.message_id) {
          updatedTrade = await updateTradeStatus(tradeById.message_id, 'completed', interaction.user.id, 'Counter offer accepted');
        }
      }
      
      if (!updatedTrade) {
        console.error('Failed to update trade status');
        return interaction.reply({
          content: '❌ Failed to update trade status. Please try again.',
          ephemeral: true,
          flags: 1 << 6
        });
      }
      
      await updateTradeOffer(trade.id, userId, 'accepted');
      
      try {
        const channel = await interaction.client.channels.fetch(updatedTrade.channel_id).catch(() => null);
        if (channel) {
          channel.messages.fetch(updatedTrade.message_id)
            .then(message => updateTradeMessage(message, updatedTrade))
            .catch(() => {});
        }
      } catch (error) {
        console.error('Error updating trade message:', error);
      }
    } catch (updateError) {
      console.error('Error updating trade status:', updateError);
      return interaction.reply({
        content: 'An error occurred while updating the trade status. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      });
    }
    
    try {
      const counterOfferer = await interaction.client.users.fetch(userId);
      
      if (interaction.isButton()) {
        await interaction.update({
          content: `✅ You have accepted the counter offer from ${counterOfferer.tag}!`,
          components: [],
          embeds: interaction.message.embeds.map(embed => {
            const embedData = embed.data;
            return new EmbedBuilder(embedData)
              .setTitle('✅ Counter Offer Accepted')
              .setColor(0x57F287);
          })
        });
      }
      
      try {
        await counterOfferer.send({
          content: `✅ <@${interaction.user.id}> has accepted your counter offer!`,
          embeds: [
            new EmbedBuilder()
              .setTitle('✅ Counter Offer Accepted')
              .setColor(0x57F287)
              .addFields(
                { name: 'Looking For', value: trade.looking_for || 'Not specified', inline: true },
                { name: 'Offering', value: trade.offering || 'Not specified', inline: true },
                { 
                  name: 'Trade Link', 
                  value: `[Jump to Trade](https://discord.com/channels/${interaction.guild?.id || '@me'}/${trade.channel_id || 'DM'}/${trade.message_id || 'message'})`,
                  inline: false
                }
              )
              .setFooter({ text: `Trade ID: ${trade.id}` })
              .setTimestamp()
          ]
        });
      } catch (dmError) {
        console.error('Error sending DM to counter offerer:', dmError);
      }
      
    } catch (userError) {
      console.error('Error fetching user or sending confirmation:', userError);
      if (interaction.isButton()) {
        await interaction.update({
          content: '✅ Counter offer accepted, but there was an error notifying the other user.',
          components: []
        });
      }
    }
  } catch (error) {
    if (!interaction.replied) {
      interaction.reply({
        content: 'An error occurred while processing your request. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      });
    }
  }
}

async function handleCounterOfferRejection(interaction) {
  const [_, tradeId, userId] = interaction.customId.match(/reject_counter_(\d+)_(\d+)/) || [];
  
  if (!tradeId || !userId) {
    return interaction.reply({
      content: 'Invalid counter offer rejection request.',
      ephemeral: true,
      flags: 1 << 6
    });
  }
  
  try {
    const trade = await getTradeByMessageId(tradeId);
    if (!trade) {
      return interaction.reply({
        content: 'Trade not found. It may have been deleted or already processed.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    if (interaction.user.id !== trade.user_id) {
      return interaction.reply({
        content: 'Only the trade creator can reject this counter offer.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    const counterOfferer = await interaction.client.users.fetch(userId).catch(console.error);
    if (counterOfferer) {
      await counterOfferer.send({
        content: `❌ <@${interaction.user.id}> has rejected your counter offer.`,
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Counter Offer Rejected')
            .setColor(0xED4245)
            .addFields(
              { name: 'Original Trade', value: `**Looking For:** ${trade.looking_for}\n**Offering:** ${trade.offering}` },
              { 
                name: 'Trade Link', 
                value: `[Jump to Trade](https://discord.com/channels/${interaction.guild?.id || '@me'}/${trade.channel_id || 'DM'}/${trade.message_id || 'message'})`,
                inline: false 
              }
            )
            .setFooter({ text: `Trade ID: ${trade.id}` })
            .setTimestamp()
        ]
      }).catch(console.error);
    }

    if (interaction.isButton()) {
      try {
        await interaction.update({
          content: '❌ You have rejected the counter offer.',
          components: [],
          embeds: interaction.message.embeds.map(embed => {
            const embedData = embed.data;
            return new EmbedBuilder(embedData)
              .setTitle('❌ Counter Offer Rejected')
              .setColor(0xED4245);
          })
        });
      } catch (updateError) {
        console.error('Error updating interaction:', updateError);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ You have rejected the counter offer. (Could not update original message)',
            ephemeral: true,
            flags: 1 << 6
          });
        }
      }
    }
  } catch (error) {
    console.error('Error handling counter offer rejection:', error);
    if (!interaction.replied) {
      interaction.reply({
        content: 'An error occurred while processing your request. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      });
    }
  }
}

async function handleTradeRejection(interaction) {
  const [_, messageId, userId] = interaction.customId.match(/reject_trade_(\d+)_(\d+)/) || [];
  
  if (!messageId || !userId) {
    return interaction.reply({
      content: 'Invalid trade rejection request.',
      ephemeral: true,
      flags: 1 << 6
    });
  }
  
  try {
    const trade = await getTradeByMessageId(messageId);
    if (!trade) {
      return interaction.reply({
        content: 'Trade not found. It may have been deleted or already processed.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    if (interaction.user.id !== trade.user_id) {
      return interaction.reply({
        content: 'Only the trade creator can reject this trade.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    try {
      await updateTradeOffer(trade.id, userId, 'rejected');
      
      const updatedTrade = await getTradeByMessageId(messageId);
      
      if (updatedTrade) {
        try {
          const channel = await interaction.client.channels.fetch(updatedTrade.channel_id).catch(() => null);
          if (channel) {
            channel.messages.fetch(updatedTrade.message_id)
              .then(message => updateTradeMessage(message, updatedTrade).catch(console.error))
              .catch(() => {
                console.log(`[Rejection] Message ${updatedTrade.message_id} not found in channel ${updatedTrade.channel_id}, but trade is still processed`);
              });
          }
        } catch (error) {
          console.error('Error in rejection message update process:', error);
        }
      }
    } catch (updateError) {
      console.error('Error updating trade status for rejection:', updateError);
    }
    
    try {
      const tradeAccepter = await interaction.client.users.fetch(userId);
      
      try {
        await tradeAccepter.send({
          content: `❌ <@${trade.user_id}> has rejected your trade offer.`,
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Trade Rejected')
              .setDescription('The trade creator has rejected your offer.')
              .addFields(
                { name: 'Looking For', value: trade.looking_for || 'Not specified' },
                { name: 'Offering', value: trade.offering || 'Not specified' }
              )
          ]
        });
      } catch (dmError) {
        console.error('Error sending rejection DM:', dmError);
      }
      
      await interaction.reply({
        content: `You have rejected the trade offer from ${tradeAccepter.tag}.`,
        ephemeral: true,
        flags: 1 << 6
      });
      
    } catch (userError) {
      console.error('Error fetching user for rejection:', userError);
      await interaction.reply({
        content: 'You have rejected the trade offer.',
        ephemeral: true,
        flags: 1 << 6
      });
    }
    
  } catch (error) {
    console.error('Error rejecting trade:', error);
    try {
      await interaction.reply({
        content: 'An error occurred while rejecting the trade. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      });
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
  }
}
