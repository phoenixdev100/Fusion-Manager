import { dbPromise } from '../connect.js';

/**
 * @param {string} channelId
 * @param {string} staffId
 * @param {string} managerId
 * @param {string} createdAt
 * @returns {Promise<number>}
 */
export async function addStaffApplication(channelId, staffId, managerId, createdAt) {
  const db = await dbPromise;
  const result = await db.run(
    `INSERT INTO staff_applications (channel_id, staff_id, manager_id, created_at) VALUES (?, ?, ?, ?)`,
    [channelId, staffId, managerId, createdAt]
  );
  return result.lastID;
}

/**
 * @param {string} channelId
 * @returns {Promise<Object>}
 */
export async function getStaffApplicationByChannel(channelId) {
  const db = await dbPromise;
  return await db.get(
    `SELECT * FROM staff_applications WHERE channel_id = ?`,
    [channelId]
  );
}

/**
 * @param {string} channelId
 * @param {string} userId
 * @returns {Promise<Array<string>>}
 */
export async function addAdditionalUserToStaffApplication(channelId, userId) {
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

/**
 * @param {string} channelId
 * @param {string} userId
 * @returns {Promise<Array<string>>}
 */
export async function removeAdditionalUserFromStaffApplication(channelId, userId) {
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
