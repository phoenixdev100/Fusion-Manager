import { SlashCommandBuilder } from 'discord.js';
import roles from '../../config/roles.json' with { type: 'json' };
import { fetchProfile } from '../../utils/fetchProfile.js';
import { formatYouTubeLink, formatTikTokLink } from '../../utils/formatLinks.js';
import { findFusionVideo } from '../../utils/youtubeSearch.js';

export default {
  name: 'syncmedia',
  data: new SlashCommandBuilder()
    .setName('syncmedia')
    .setDescription('List YouTube and TikTok accounts of medias.'),
  async execute(interaction) {
    const MEDIA_ROLE = roles.MEDIA_ROLE;
    await interaction.deferReply();
    const fields = [];
    try {
      await interaction.guild.members.fetch();
      const membersWithRole = interaction.guild.members.cache.filter(m => m.roles.cache.has(MEDIA_ROLE));
      if (membersWithRole.size === 0) {
        await interaction.editReply({ content: 'No users found with the media role.' });
        return;
      }
      for (const [userId, member] of membersWithRole) {
        try {
          const data = await fetchProfile(userId);
          if (!data) {
            fields.push({ name: member.user?.username || userId, value: `<@${userId}>: Failed to fetch profile.`, inline: false });
            continue;
          }
          const connected = data.connected_accounts || [];
          const youtube = connected.find(acc => acc.type === 'youtube');
          const tiktok = connected.find(acc => acc.type === 'tiktok');

          let links = [];
          if (youtube) {
            const ytUrl = formatYouTubeLink(youtube);
            if (ytUrl) links.push(`[YouTube](${ytUrl})`);
          }
          if (tiktok) {
            const ttUrl = formatTikTokLink(tiktok);
            if (ttUrl) links.push(`[TikTok](${ttUrl})`);
          }
          let value = `<@${userId}> : `;
          if (links.length > 0) {
            value += links.join(' - ');
          } else {
            value += 'No YouTube or TikTok accounts found.';
          }
          fields.push({ name: member.user?.username || userId, value, inline: false });

          if (youtube && youtube.id && youtube.id.startsWith('UC')) {
            const fusionResult = await findFusionVideo(youtube.id);
            if (fusionResult) {
              const date = fusionResult.publishedAt ? fusionResult.publishedAt.split('T')[0] : 'Unknown date';
              fields.push({
                name: 'Fusion Video Found',
                value: `Found [${fusionResult.videoTitle}](${fusionResult.videoUrl}) containing Fusion on [${fusionResult.channelTitle}](${fusionResult.channelUrl})\nUploaded: ${date}`,
                inline: false
              });
            }
          }
        } catch (err) {
          fields.push({ name: member.user?.username || userId, value: `<@${userId}>: Error fetching profile.`, inline: false });
        }
      }
      await interaction.editReply({
        embeds: [{
          title: 'Media Role Accounts',
          color: 0x323339,
          fields: fields.length > 0 ? fields : [{ name: 'No Results', value: 'No users found or no accounts linked.' }],
        }]
      });
    } catch (err) {
      await interaction.editReply({ content: `Failed to fetch members or profiles: ${err.message}` });
    }
  }
};
