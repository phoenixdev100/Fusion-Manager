import { addSuggestion } from '../../../database/models/suggestion.js';
import { EmbedBuilder } from 'discord.js';
import { success, error } from '../../../utils/logger.js';

/**
 * Handle a suggestion message
 * @param {Message} message
 */
export async function handleSuggestion(message) {
  try {
    const suggestionEmbed = new EmbedBuilder()
      .setColor(0x323339)
      .addFields(
        { name: 'Submitter', value: message.author.username, inline: true },
        { name: 'Suggestion', value: message.content, inline: false },
        { name: 'Results so far', value: '<:g_checkmark:1205513702783189072>: 0\n<:r_cross:1205513709963976784>: 0', inline: false }
      )
      .setFooter({ text: `Suggestion ID: ${message.id}` })
      .setTimestamp();
    
    await message.delete().catch(err => {
      console.error('Error deleting original suggestion message:', err);
    });
    
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggestion_upvote_${message.id}`)
        .setEmoji('<:g_checkmark:1205513702783189072>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`suggestion_downvote_${message.id}`)
        .setEmoji('<:r_cross:1205513709963976784>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`suggestion_viewvotes_${message.id}`)
        .setLabel('View')
        .setStyle(ButtonStyle.Secondary)
    );

    const suggestionMessage = await message.channel.send({
      embeds: [suggestionEmbed],
      components: [row]
    });

    await addSuggestion(
      suggestionMessage.id,
      message.channel.id,
      message.author.id
    );
    
    success(`New suggestion created by ${message.author.tag} in ${message.guild.name}`);
  } catch (err) {
    error('Error processing suggestion:', err);
  }
}
