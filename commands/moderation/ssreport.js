import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import roles from '../../config/roles.json' with { type: 'json' };
import config from '../../config/config.json' with { type: 'json' };

export default {
  name: 'ssreport',
  data: new SlashCommandBuilder()
    .setName('ssreport')
    .setDescription('Report a rule violation with evidence')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Username of the person who violated the rules')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('rule')
        .setDescription('Rule that was violated')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('evidence')
        .setDescription('Evidence of the violation (screenshot URL or description)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!roles.STAFF_ROLE.some(role => interaction.member.roles.cache.has(role))) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getString('username');
    const rule = interaction.options.getString('rule');
    const evidence = interaction.options.getString('evidence');
    const reporter = interaction.user;

    const reportEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Rule Violation Report')
      .setDescription(`**Reported User:** ${targetUser}\n
        **Reported By:** ${reporter} (${reporter.tag})\n
        **Rule Violated:** ${rule}\n\n**Evidence:**\n${evidence}`)
      .setTimestamp()
      .setFooter({ text: 'Rule Violation Report' });

    try {
      const reportChannel = interaction.guild.channels.cache.get('899659621097152563');
      if (!reportChannel) {
        return interaction.reply({
          content: 'Error: Report channel not found. Please contact an administrator.',
          ephemeral: true
        });
      }

      await reportChannel.send({ embeds: [reportEmbed] });
      
      await interaction.reply({
        content: `Rule violation report for ${targetUser} has been submitted successfully.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error sending report:', error);
      await interaction.reply({
        content: 'There was an error submitting the report. Please try again or contact an administrator.',
        ephemeral: true
      });
    }
  }
};
