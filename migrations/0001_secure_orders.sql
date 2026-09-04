PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS inventory (
  product_id TEXT PRIMARY KEY,
  stock INTEGER NOT NULL CHECK (stock >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  phone TEXT NOT NULL CHECK (length(phone) BETWEEN 10 AND 16),
  governorate TEXT NOT NULL,
  city TEXT NOT NULL CHECK (length(city) BETWEEN 2 AND 80),
  address TEXT NOT NULL CHECK (length(address) BETWEEN 5 AND 240),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 500),
  payment TEXT NOT NULL CHECK (payment IN ('cod', 'card')),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  fee INTEGER NOT NULL CHECK (fee >= 0),
  total INTEGER NOT NULL CHECK (total = subtotal + fee),
  item_count INTEGER NOT NULL CHECK (item_count BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'shipped', 'completed', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  size TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS order_rate_limits (
  client_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts >= 0),
  PRIMARY KEY (client_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
