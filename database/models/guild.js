import { dbPromise } from '../connect.js';

async function setBugReportChannel(guildId, channelId) {
  const db = await dbPromise;
  
  await db.run(
    `INSERT OR REPLACE INTO bug_settings (guild_id, report_channel_id) VALUES (?, ?)`,
    [guildId, channelId]
  );
}

async function getBugReportChannel(guildId) {
  const db = await dbPromise;
  
  const result = await db.get(
    `SELECT report_channel_id FROM bug_settings WHERE guild_id = ?`,
    [guildId]
  );
  
  return result ? result.report_channel_id : null;
}

async function setSuggestionChannel(guildId, channelId) {
  const db = await dbPromise;
  
  await db.run(
    `INSERT OR REPLACE INTO suggestion_settings (guild_id, suggestion_channel_id) VALUES (?, ?)`,
    [guildId, channelId]
  );
}

async function getSuggestionChannel(guildId) {
  const db = await dbPromise;
  
  const result = await db.get(
    `SELECT suggestion_channel_id FROM suggestion_settings WHERE guild_id = ?`,
    [guildId]
  );
  
  return result ? result.suggestion_channel_id : null;
}

export {
  setBugReportChannel,
  getBugReportChannel,
  setSuggestionChannel,
  getSuggestionChannel
};
