import { addBugReport } from '../../../database/models/bug.js';
import { EmbedBuilder } from 'discord.js';
import { success } from '../../../utils/logger.js';

/**
 * Handle a bug report message
 * @param {Message} message
 */
export async function handleBugReport(message) {
  try {
    const content = message.content;
    
    const modeMatch = content.match(/\[Mode\]\s+(.*?):/i);
    const bugMatch = content.match(/\[Bug\]\s+(.*?):/i);
    const descMatch = content.match(/\[Bug Description\]\s+(.*?):/i);
    const mediaMatch = content.match(/\[Media\]\s+(.*?):/i);
    
    if (!modeMatch || !bugMatch || !descMatch) {
      try {
        await message.delete();
      } catch (err) {
        console.error('Error deleting invalid bug report:', err);
      }
      
      const reminder = await message.channel.send({
        content: `<@${message.author.id}>`,
        embeds: [{
          title: '❌ Invalid Bug Report Format',
          description: 'Your bug report does not follow the required format. Please use the format below:',
          fields: [{
            name: 'Required Format',
            value: '```\n[Mode] Mode name:\n[Bug] Bug name:\n[Bug Description] Description:\n[Media] Any image or video link:\n```'
          }],
          color: 0xFF0000
        }]
      });
      
      setTimeout(() => {
        reminder.delete().catch(err => console.error('Error deleting reminder message:', err));
      }, 5000);
      
      return;
    }
    
    const extractValue = (match, content, nextFieldIndex) => {
      if (!match) return null;
      
      const startPos = content.indexOf(match[0]) + match[0].length;
      let endPos;
      
      const nextFields = [
        content.indexOf('[Bug]', startPos),
        content.indexOf('[Bug Description]', startPos),
        content.indexOf('[Media]', startPos)
      ].filter(pos => pos > startPos);
      
      if (nextFields.length > 0) {
        endPos = Math.min(...nextFields);
      } else {
        endPos = content.length;
      }
      
      return content.substring(startPos, endPos).trim();
    };
    
    const mode = extractValue(modeMatch, content);
    const bugName = extractValue(bugMatch, content);
    const description = extractValue(descMatch, content);
    const media = mediaMatch ? extractValue(mediaMatch, content) : null;
    
    await addBugReport(
      message.id,
      message.channel.id,
      message.author.id
    );

    await message.delete().catch(err => {
      console.error('Error deleting original bug report message:', err);
    });

    const bugEmbed = new EmbedBuilder()
      .setTitle('🐞 New Bug Report')
      .setColor(0xFF0000)
      .addFields(
        { name: 'Mode', value: mode || 'N/A', inline: true },
        { name: 'Bug', value: bugName || 'N/A', inline: true },
        { name: 'Reported by', value: `<@${message.author.id}>`, inline: true },
        { name: 'Description', value: description || 'N/A', inline: false }
      )
      .setFooter({ text: `Bug Report ID: ${message.id}` })
      .setTimestamp();

    const attachment = message.attachments?.first();
    if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
      bugEmbed.setImage(attachment.url);
    }
    if (media) {
      bugEmbed.addFields({ name: 'Media', value: media, inline: false });
    }

    const bugMessage = await message.channel.send({ embeds: [bugEmbed] });

    try {
      const threadName = mode ? `Bug Report ${mode}` : `Bug Report ${message.id}`;
      await bugMessage.startThread({
        name: threadName,
        autoArchiveDuration: 1440
      });
    } catch (threadErr) {
      console.error('Failed to create thread for bug report:', threadErr);
    }

    success(`New bug report created by ${message.author.tag} in ${message.guild.name}`);
  } catch (error) {
    console.error('Error processing bug report:', error);
  }
}
