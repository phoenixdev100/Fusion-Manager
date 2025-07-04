import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { success } from '../utils/logger.js';

const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPromise = open({
  filename: path.join(dataDir, 'database.db'),
  driver: sqlite3.Database
});

async function initDatabase() {
  const db = await dbPromise;
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bug_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      handler_id TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bug_settings (
      guild_id TEXT PRIMARY KEY,
      report_channel_id TEXT
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      handler_id TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS suggestion_settings (
      guild_id TEXT PRIMARY KEY,
      suggestion_channel_id TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS staff_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL UNIQUE,
      staff_id TEXT NOT NULL,
      manager_id TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      additional_users TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      looking_for TEXT NOT NULL,
      offering TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      handler_id TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS trade_settings (
      guild_id TEXT PRIMARY KEY,
      trade_channel_id TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS trade_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trade_id) REFERENCES trades (id) ON DELETE CASCADE,
      UNIQUE(trade_id, user_id)
    )
  `);

  const pragma = await db.all(`PRAGMA table_info(staff_applications)`);
  if (!pragma.some(col => col.name === 'additional_users')) {
    await db.exec(`ALTER TABLE staff_applications ADD COLUMN additional_users TEXT`);
  }

  success('Database initialized successfully');
}

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

async function getBugReportsByStatus(status) {
  const db = await dbPromise;
  
  return await db.all(
    `SELECT * FROM bug_reports WHERE status = ? ORDER BY created_at DESC`,
    [status]
  );
}

async function getUserBugStats(userId) {
  const db = await dbPromise;
  
  const [
    totalReported,
    accepted,
    declined,
    pending
  ] = await Promise.all([
    db.get(`SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ?`, [userId]),
    db.get(`SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'accepted'`, [userId]),
    db.get(`SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'declined'`, [userId]),
    db.get(`SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'pending'`, [userId])
  ]);
  
  return {
    total: totalReported.count,
    accepted: accepted.count,
    declined: declined.count,
    pending: pending.count
  };
}

async function addStaffApplication(channelId, staffId, managerId, createdAt) {
  const db = await dbPromise;
  const result = await db.run(
    `INSERT INTO staff_applications (channel_id, staff_id, manager_id, created_at) VALUES (?, ?, ?, ?)`,
    [channelId, staffId, managerId, createdAt]
  );
  return result.lastID;
}

async function getStaffApplicationByChannel(channelId) {
  const db = await dbPromise;
  return await db.get(
    `SELECT * FROM staff_applications WHERE channel_id = ?`,
    [channelId]
  );
}

async function addAdditionalUserToStaffApplication(channelId, userId) {
  const db = await dbPromise;
  const row = await db.get(
    `SELECT additional_users FROM staff_applications WHERE channel_id = ?`,
    [channelId]
  );
  
  let users = [];
  if (row?.additional_users) {
    try { 
      users = JSON.parse(row.additional_users); 
    } catch { 
      users = []; 
    }
  }
  
  if (!users.includes(userId)) {
    users.push(userId);
  }
  
  await db.run(
    `UPDATE staff_applications SET additional_users = ? WHERE channel_id = ?`,
    [JSON.stringify(users), channelId]
  );
  
  return users;
}

async function removeAdditionalUserFromStaffApplication(channelId, userId) {
  const db = await dbPromise;
  const row = await db.get(
    `SELECT additional_users FROM staff_applications WHERE channel_id = ?`,
    [channelId]
  );
  
  let users = [];
  if (row?.additional_users) {
    try { 
      users = JSON.parse(row.additional_users); 
    } catch { 
      users = []; 
    }
  }
  
  users = users.filter(id => id !== userId);
  
  await db.run(
    `UPDATE staff_applications SET additional_users = ? WHERE channel_id = ?`,
    [JSON.stringify(users), channelId]
  );
  
  return users;
}

export {
  dbPromise,
  initDatabase,
  
  addBugReport,
  updateBugStatus,
  getBugReportByMessageId,
  setBugReportChannel,
  getBugReportChannel,
  getBugReportsByStatus,
  getUserBugStats,
  
  addStaffApplication,
  getStaffApplicationByChannel,
  addAdditionalUserToStaffApplication,
  removeAdditionalUserFromStaffApplication
};
