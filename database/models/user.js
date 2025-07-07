import { dbPromise } from '../connect.js';

async function getUserBugStats(userId) {
  const db = await dbPromise;
  
  const totalReported = await db.get(
    `SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ?`,
    [userId]
  );
  
  const accepted = await db.get(
    `SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'accepted'`,
    [userId]
  );
  
  const declined = await db.get(
    `SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'declined'`,
    [userId]
  );
  
  const pending = await db.get(
    `SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'pending'`,
    [userId]
  );
  
  return {
    total: totalReported.count,
    accepted: accepted.count,
    declined: declined.count,
    pending: pending.count
  };
}

async function getBugReportsByUser(userId) {
  const db = await dbPromise;
  
  return await db.all(
    `SELECT * FROM bug_reports WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
}

async function getUserSuggestionStats(userId) {
  const db = await dbPromise;
  
  const totalSuggested = await db.get(
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
    total: totalSuggested.count,
    accepted: accepted.count,
    declined: declined.count,
    pending: pending.count
  };
}

export {
  getUserBugStats,
  getBugReportsByUser,
  getUserSuggestionStats
};
