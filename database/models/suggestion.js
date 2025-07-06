import { dbPromise } from '../connect.js';

/**
 * @param {string} messageId
 * @param {string} channelId
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function addSuggestion(messageId, channelId, userId) {
  const db = await dbPromise;
  
  const result = await db.run(
    `INSERT INTO suggestions 
     (message_id, channel_id, user_id) 
     VALUES (?, ?, ?)`,
    [messageId, channelId, userId]
  );
  
  return result.lastID;
}

/**
 * @param {string} messageId
 * @param {string} status
 * @param {string} handlerId
 * @param {string} reason
 * @returns {Promise<object>}
 */
async function updateSuggestionStatus(messageId, status, handlerId, reason = null) {
  const db = await dbPromise;
  
  await db.run(
    `UPDATE suggestions 
     SET status = ?, handler_id = ?, reason = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE message_id = ?`,
    [status, handlerId, reason, messageId]
  );
  
  return await getSuggestionByMessageId(messageId);
}

/**
 * @param {string} messageId
 * @returns {Promise<object>}
 */
async function getSuggestionByMessageId(messageId) {
  const db = await dbPromise;
  
  return await db.get(
    `SELECT * FROM suggestions WHERE message_id = ?`,
    [messageId]
  );
}

/**
 * @param {string} status
 * @returns {Promise<Array>}
 */
async function getSuggestionsByStatus(status) {
  const db = await dbPromise;
  
  return await db.all(
    `SELECT * FROM suggestions WHERE status = ? ORDER BY created_at DESC`,
    [status]
  );
}

/**
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getUserSuggestionStats(userId) {
  const db = await dbPromise;
  
  const totalSubmitted = await db.get(
    `SELECT COUNT(*) as count FROM suggestions WHERE user_id = ?`,
    [userId]
  );
  
  const accepted = await db.get(
    `SELECT COUNT(*) as count FROM suggestions WHERE user_id = ? AND status = 'accepted'`,
    [userId]
  );
  
  const declined = await db.get(
    `SELECT COUNT(*) as count FROM suggestions WHERE user_id = ? AND status = 'declined'`,
    [userId]
  );
  
  const pending = await db.get(
    `SELECT COUNT(*) as count FROM suggestions WHERE user_id = ? AND status = 'pending'`,
    [userId]
  );
  
  return {
    total: totalSubmitted.count,
    accepted: accepted.count,
    declined: declined.count,
    pending: pending.count
  };
}

export {
  addSuggestion,
  updateSuggestionStatus,
  getSuggestionByMessageId,
  getSuggestionsByStatus,
  getUserSuggestionStats
};
