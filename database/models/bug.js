import { dbPromise } from '../connect.js';

async function addBugReport(messageId, channelId, userId) {
  const db = await dbPromise;
  
  const result = await db.run(
    `INSERT INTO bug_reports 
     (message_id, channel_id, user_id) 
     VALUES (?, ?, ?)`,
    [messageId, channelId, userId]
  );
  
  return result.lastID;
}

async function updateBugStatus(messageId, status, handlerId, reason = null) {
  const db = await dbPromise;
  
  await db.run(
    `UPDATE bug_reports 
     SET status = ?, handler_id = ?, reason = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE message_id = ?`,
    [status, handlerId, reason, messageId]
  );
  
  return await getBugReportByMessageId(messageId);
}

async function getBugReportByMessageId(messageId) {
  const db = await dbPromise;
  
  return await db.get(
    `SELECT * FROM bug_reports WHERE message_id = ?`,
    [messageId]
  );
}

async function getBugReportsByStatus(status) {
  const db = await dbPromise;
  
  return await db.all(
    `SELECT * FROM bug_reports WHERE status = ? ORDER BY created_at DESC`,
    [status]
  );
}

export {
  addBugReport,
  updateBugStatus,
  getBugReportByMessageId,
  getBugReportsByStatus
};
