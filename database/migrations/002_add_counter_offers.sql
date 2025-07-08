ALTER TABLE trades ADD COLUMN has_pending_offer BOOLEAN DEFAULT 0;

CREATE TABLE IF NOT EXISTS counter_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    offer TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
    UNIQUE(trade_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_counter_offers_trade_id ON counter_offers(trade_id);
CREATE INDEX IF NOT EXISTS idx_counter_offers_user_id ON counter_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_counter_offers_status ON counter_offers(status);
