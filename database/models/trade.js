import { dbPromise } from '../connect.js';

export async function addTrade(messageId, channelId, userId, lookingFor, offering) {
  const db = await dbPromise;
  
  const result = await db.run(
    `INSERT INTO trades 
     (message_id, channel_id, user_id, looking_for, offering) 
     VALUES (?, ?, ?, ?, ?)`,
    [messageId, channelId, userId, lookingFor, offering]
  );
  
  return result.lastID;
}

export async function updateTradeStatus(messageId, status, handlerId = null, reason = null) {
  const db = await dbPromise;
  
  const currentTrade = await getTradeByMessageId(messageId);
  if (!currentTrade) {
    return null;
  }
  
  await db.run(
    `UPDATE trades 
     SET status = ?, 
         handler_id = ?,
         reason = ?, 
         updated_at = CURRENT_TIMESTAMP 
     WHERE message_id = ?`,
    [status, handlerId || currentTrade.handler_id, reason, messageId]
  );
  
  return await getTradeByMessageId(messageId);
}

export async function addTradeOffer(tradeId, userId, status = 'pending') {
  const db = await dbPromise;
  
  const existing = await db.get(
    `SELECT * FROM trade_offers WHERE trade_id = ? AND user_id = ?`,
    [tradeId, userId]
  );
  
  if (existing) {
    await db.run(
      `UPDATE trade_offers SET status = ?, created_at = CURRENT_TIMESTAMP 
       WHERE trade_id = ? AND user_id = ?`,
      [status, tradeId, userId]
    );
  } else {
    await db.run(
      `INSERT INTO trade_offers (trade_id, user_id, status) VALUES (?, ?, ?)`,
      [tradeId, userId, status]
    );
  }
  
  return {
    tradeId,
    userId,
    status
  };
}

export async function getTradeOffers(tradeId, status = null) {
  const db = await dbPromise;
  
  let query = 'SELECT * FROM trade_offers WHERE trade_id = ?';
  const params = [tradeId];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  return await db.all(query, params);
}

export async function updateTradeOffer(tradeId, userId, status) {
  const db = await dbPromise;
  
  await db.run(
    `UPDATE trade_offers SET status = ? WHERE trade_id = ? AND user_id = ?`,
    [status, tradeId, userId]
  );
  
  return await db.get(
    `SELECT * FROM trade_offers WHERE trade_id = ? AND user_id = ?`,
    [tradeId, userId]
  );
}

export async function getTradeByMessageId(messageId) {
  const db = await dbPromise;
  
  return await db.get(
    `SELECT * FROM trades WHERE message_id = ?`,
    [messageId]
  );
}

export async function getTradeById(id) {
  const db = await dbPromise;
  return await db.get(
    'SELECT * FROM trades WHERE id = ?',
    [id]
  );
}

export async function getTradesByStatus(status) {
  const db = await dbPromise;
  
  return await db.all(
    `SELECT * FROM trades WHERE status = ? ORDER BY created_at DESC`,
    [status]
  );
}

export async function setTradeChannel(guildId, channelId) {
  const db = await dbPromise;
  
  await db.run(
    `INSERT OR REPLACE INTO trade_settings (guild_id, trade_channel_id) VALUES (?, ?)`,
    [guildId, channelId]
  );
}

export async function getTradeChannel(guildId) {
  const db = await dbPromise;
  
  const result = await db.get(
    `SELECT trade_channel_id FROM trade_settings WHERE guild_id = ?`,
    [guildId]
  );
  
  return result ? result.trade_channel_id : null;
}

export async function addCounterOffer(tradeId, userId, counterOffer) {
  const db = await dbPromise;
  
  const trade = await db.get('SELECT * FROM trades WHERE id = ?', [tradeId]);
  if (!trade) {
    throw new Error('Trade not found');
  }
  
  await db.run(
    `INSERT INTO counter_offers (trade_id, user_id, offer, status, created_at)
     VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
     ON CONFLICT(trade_id, user_id) 
     DO UPDATE SET offer = ?, status = 'pending', created_at = CURRENT_TIMESTAMP`,
    [tradeId, userId, counterOffer, counterOffer]
  );
  
  await db.run(
    `UPDATE trades SET has_pending_offer = 1 WHERE id = ?`,
    [tradeId]
  );
  
  return {
    tradeId,
    userId,
    offer: counterOffer,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}
