const suggestionVotes = {};

export async function handleSuggestionButton(interaction) {
    if (!interaction.isButton() || !interaction.customId.startsWith('suggestion_')) return;
    
    const { customId, user, message } = interaction;
    const [, type, msgId] = customId.split('_');
    if (!type || !msgId) return;

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }).catch(console.error);
    }

    if (!suggestionVotes[msgId]) {
        suggestionVotes[msgId] = {};
    }

    if (type === 'upvote' || type === 'downvote') {
        if (suggestionVotes[msgId][user.id] === type) {
            delete suggestionVotes[msgId][user.id];
        } else {
            suggestionVotes[msgId][user.id] = type;
        }
        
        const votes = suggestionVotes[msgId] || {};
        const upvotes = Object.values(votes).filter(v => v === 'upvote').length;
        const downvotes = Object.values(votes).filter(v => v === 'downvote').length;
        
        const embed = message.embeds[0];
        const resultsField = embed.fields.find(field => field.name === 'Results so far');
        if (resultsField) {
            resultsField.value = `<:g_checkmark:1205513702783189072>: ${upvotes}\n<:r_cross:1205513709963976784>: ${downvotes}`;
        }
        
        try {
            await message.edit({ embeds: [embed] });
            await interaction.editReply({ 
                content: `You ${suggestionVotes[msgId][user.id] ? `voted ${type === 'upvote' ? '<:g_checkmark:1205513702783189072>' : '<:r_cross:1205513709963976784>'}` : 'removed your vote'}!`
            });
        } catch (error) {
            console.error('Error updating suggestion:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An error occurred while processing your vote.', ephemeral: true }).catch(console.error);
            } else {
                await interaction.editReply({ content: 'An error occurred while processing your vote.' }).catch(console.error);
            }
        }
    } else if (type === 'viewvotes') {
        const votes = suggestionVotes[msgId] || {};
        if (Object.keys(votes).length === 0) {
            try {
                await interaction.editReply({ content: 'No votes yet.' });
            } catch (error) {
                console.error('Error editing reply:', error);
            }
            return;
        }
        const upvoters = Object.entries(votes).filter(([, v]) => v === 'upvote');
        const downvoters = Object.entries(votes).filter(([, v]) => v === 'downvote');
        let result = '';
        if (upvoters.length) {
            result += `<:g_checkmark:1205513702783189072> **Upvotes:**\n` + upvoters.map(([id]) => `<@${id}>`).join('\n') + '\n';
        }
        if (downvoters.length) {
            result += `<:r_cross:1205513709963976784> **Downvotes:**\n` + downvoters.map(([id]) => `<@${id}>`).join('\n');
        }
        await interaction.editReply({ content: result });
    }
}
