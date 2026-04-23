-- SQLite schema for QuickPOS
-- Converted from MySQL dump (Dump20260423.sql)
--
-- Usage (one-time data import):
--   sqlite3 database/pos.db < database/sqlite_schema.sql
--
-- The server auto-creates tables via database.js on startup.
-- Run this script only to seed historical data from the MySQL export.

PRAGMA foreign_keys = OFF;

-- ─────────────────────────────────────────────
-- SCHEMA
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  user_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT    NOT NULL UNIQUE,
  password       TEXT    NOT NULL,
  role           TEXT    NOT NULL CHECK(role IN ('admin', 'manager', 'cashier')),
  created_at     TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  customer_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  phone          TEXT,
  email          TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at     TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  product_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  product_name   TEXT    NOT NULL,
  category       TEXT,
  price          REAL    NOT NULL,
  barcode        TEXT    UNIQUE,
  created_at     TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory (
  inventory_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     INTEGER NOT NULL UNIQUE,
  stock_quantity INTEGER DEFAULT 0,
  last_updated   TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
  sale_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  cashier_id     INTEGER NOT NULL,
  customer_id    INTEGER,
  total_amount   REAL    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'completed',
  sale_date      TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (cashier_id)  REFERENCES users(user_id),
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS sales_items (
  sale_item_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id        INTEGER NOT NULL,
  product_id     INTEGER NOT NULL,
  quantity       INTEGER NOT NULL,
  unit_price     REAL    NOT NULL,
  subtotal       REAL    NOT NULL,
  FOREIGN KEY (sale_id)    REFERENCES sales(sale_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id        INTEGER NOT NULL,
  payment_method TEXT    NOT NULL CHECK(payment_method IN ('cash', 'mobile_money', 'card')),
  amount         REAL    NOT NULL,
  payment_date   TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS paystack_transactions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reference      TEXT    NOT NULL UNIQUE,
  cashier_id     INTEGER NOT NULL,
  customer_id    INTEGER,
  amount         REAL    NOT NULL,
  status         TEXT    DEFAULT 'pending' CHECK(status IN ('pending', 'success', 'failed')),
  sale_id        INTEGER,
  cart_snapshot  TEXT    NOT NULL,
  tax            REAL    DEFAULT 0.00,
  created_at     TEXT    DEFAULT (datetime('now')),
  updated_at     TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (cashier_id)  REFERENCES users(user_id),
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (sale_id)     REFERENCES sales(sale_id)
);

-- ─────────────────────────────────────────────
-- SEED DATA  (migrated from Dump20260423.sql)
-- ─────────────────────────────────────────────

-- users
INSERT OR IGNORE INTO users (user_id, username, password, role, created_at) VALUES
(1, 'admin1', '$2b$10$hEkaQIZgqFSk0rLXQKZB6.m3rlH8zQ1xJkNoFqa5y1swMFred338W', 'admin', '2026-03-25 14:32:04');

-- products
INSERT OR IGNORE INTO products (product_id, product_name, category, price, barcode, created_at) VALUES
(1,  'Cola',                  'Drinks',        3.00,  '1234567890123', '2026-03-25 12:45:30'),
(2,  'Water',                 'Drinks',        1.00,  '1234567890124', '2026-03-25 12:45:30'),
(3,  'Burger',                'Food',          5.00,  '1234567890125', '2026-03-25 12:45:30'),
(4,  'Fries',                 'Food',          3.00,  '1234567890126', '2026-03-25 12:45:30'),
(6,  'Orange Juice',          'Drinks',        2.75,  '1234567890128', '2026-03-25 12:45:30'),
(7,  'Pizza Slice',           'Food',          4.50,  '1234567890129', '2026-03-25 12:45:30'),
(8,  'Sandwich',              'Food',          3.75,  '1234567890130', '2026-03-25 12:45:30'),
(9,  'Chips',                 'Snacks',        1.25,  '1234567890131', '2026-03-25 12:45:30'),
(10, 'Coffee',                'Drinks',        2.00,  '1234567890132', '2026-03-25 12:45:30'),
(11, 'Ceres',                 'drinks',       22.50,  '123456',        '2026-03-25 15:43:00'),
(12, 'Rice 5kg Bag',          'Groceries',    25.00,  '100000000004',  '2026-03-31 01:50:26'),
(13, 'Cooking Oil 1L',        'Groceries',    10.50,  '100000000005',  '2026-03-31 01:50:26'),
(14, 'Sugar 1kg',             'Groceries',     4.20,  '100000000006',  '2026-03-31 01:50:26'),
(15, 'Salt 500g',             'Groceries',     1.20,  '100000000007',  '2026-03-31 01:50:26'),
(16, 'Lays Chips',            'Snacks',        3.00,  '100000000008',  '2026-03-31 01:50:26'),
(17, 'Chocolate Bar',         'Snacks',        2.00,  '100000000009',  '2026-03-31 01:50:26'),
(18, 'Biscuits Pack',         'Snacks',        2.80,  '100000000010',  '2026-03-31 01:50:26'),
(19, 'Milk 1L',               'Dairy',         5.00,  '100000000011',  '2026-03-31 01:50:26'),
(20, 'Cheese Block',          'Dairy',         8.50,  '100000000012',  '2026-03-31 01:50:26'),
(21, 'Yogurt Cup',            'Dairy',         3.20,  '100000000013',  '2026-03-31 01:50:26'),
(22, 'Toilet Paper Pack',     'Household',    12.00,  '100000000014',  '2026-03-31 01:50:26'),
(23, 'Laundry Detergent',     'Household',    15.00,  '100000000015',  '2026-03-31 01:50:26'),
(24, 'Dishwashing Liquid',    'Household',     6.50,  '100000000016',  '2026-03-31 01:50:26'),
(25, 'Toothpaste',            'Personal Care', 4.50,  '100000000017',  '2026-03-31 01:50:26'),
(26, 'Bar Soap',              'Personal Care', 2.00,  '100000000018',  '2026-03-31 01:50:26'),
(27, 'Shampoo',               'Personal Care', 9.00,  '100000000019',  '2026-03-31 01:50:26'),
(28, 'Notebook A5',           'Stationery',    3.50,  '100000000020',  '2026-03-31 01:50:26'),
(29, 'Ballpoint Pen',         'Stationery',    1.00,  '100000000021',  '2026-03-31 01:50:26'),
(30, 'Mathematics Textbook',  'Books',        20.00,  '100000000022',  '2026-03-31 01:50:26'),
(31, 'English Novel',         'Books',        15.00,  '100000000023',  '2026-03-31 01:50:26');

-- inventory  (stock_quantity = canonical column, UNIQUE on product_id)
INSERT OR IGNORE INTO inventory (inventory_id, product_id, stock_quantity, last_updated) VALUES
(1, 1, 88, '2026-04-02 16:31:24'),
(2, 2, 43, '2026-03-30 20:53:12');

-- sales
INSERT OR IGNORE INTO sales (sale_id, cashier_id, customer_id, total_amount, status, sale_date) VALUES
(1,  1, NULL, 7.00,  'completed', '2026-03-30 19:33:54'),
(2,  1, NULL, 7.00,  'completed', '2026-03-30 19:34:42'),
(3,  1, NULL, 7.00,  'completed', '2026-03-30 19:35:50'),
(4,  1, NULL, 7.00,  'completed', '2026-03-30 19:37:05'),
(5,  1, NULL, 7.00,  'completed', '2026-03-30 19:44:35'),
(6,  1, NULL, 7.00,  'completed', '2026-03-30 19:44:58'),
(7,  1, NULL, 7.00,  'completed', '2026-03-30 19:45:59'),
(8,  1, NULL, 7.00,  'completed', '2026-03-30 19:54:06'),
(9,  1, NULL, 7.00,  'completed', '2026-03-30 19:58:24'),
(10, 1, NULL, 7.00,  'completed', '2026-03-30 20:01:52'),
(11, 1, NULL, 7.00,  'completed', '2026-03-30 20:03:15'),
(12, 1, NULL, 3.00,  'completed', '2026-03-30 20:53:12'),
(13, 1, NULL, 2.75,  'completed', '2026-03-30 20:53:30'),
(14, 1, NULL, 5.75,  'completed', '2026-03-30 20:54:10'),
(15, 1, NULL, 3.00,  'completed', '2026-03-30 20:54:17'),
(16, 1, NULL, 2.00,  'completed', '2026-04-02 12:56:07'),
(17, 1, NULL, 2.00,  'completed', '2026-04-02 12:56:08'),
(18, 1, NULL, 2.00,  'completed', '2026-04-02 12:56:26'),
(19, 1, NULL, 5.00,  'completed', '2026-04-02 12:56:36'),
(20, 1, NULL, 5.00,  'completed', '2026-04-02 12:56:39'),
(21, 1, NULL, 5.00,  'completed', '2026-04-02 12:56:40'),
(22, 1, NULL, 5.00,  'completed', '2026-04-02 12:56:41'),
(23, 1, NULL, 5.00,  'completed', '2026-04-02 12:58:34'),
(24, 1, NULL, 15.00, 'completed', '2026-04-02 13:01:02'),
(25, 1, NULL, 15.00, 'completed', '2026-04-02 13:01:11'),
(26, 1, NULL, 15.20, 'completed', '2026-04-02 13:02:07'),
(27, 1, NULL, 12.00, 'completed', '2026-04-02 13:13:52'),
(28, 1, NULL, 13.50, 'completed', '2026-04-02 16:31:23'),
(29, 1, NULL, 13.50, 'completed', '2026-04-02 16:31:24'),
(30, 1, NULL, 4.40,  'completed', '2026-04-02 16:32:58'),
(31, 1, NULL, 3.00,  'completed', '2026-04-02 16:33:36');

-- sales_items
INSERT OR IGNORE INTO sales_items (sale_item_id, sale_id, product_id, quantity, unit_price, subtotal) VALUES
(1,  6,  1,  2, 3.00, 6.00),
(2,  6,  2,  1, 1.00, 1.00),
(3,  7,  1,  2, 3.00, 6.00),
(4,  7,  2,  1, 1.00, 1.00),
(5,  10, 1,  2, 3.00, 6.00),
(6,  10, 2,  1, 1.00, 1.00),
(7,  11, 1,  2, 3.00, 6.00),
(8,  11, 2,  1, 1.00, 1.00),
(9,  12, 2,  3, 1.00, 3.00),
(10, 14, 1,  1, 3.00, 3.00),
(11, 15, 1,  1, 3.00, 3.00),
(12, 26, 21, 1, 3.20, 3.20),
(13, 28, 1,  1, 3.00, 3.00),
(14, 28, 13, 1, 10.50, 10.50),
(15, 29, 1,  1, 3.00, 3.00),
(16, 29, 13, 1, 10.50, 10.50),
(17, 30, 15, 1, 1.20, 1.20),
(18, 30, 21, 1, 3.20, 3.20),
(19, 31, 16, 1, 3.00, 3.00);

-- payments
INSERT OR IGNORE INTO payments (payment_id, sale_id, payment_method, amount, payment_date) VALUES
(1, 11, 'cash',         7.50, '2026-03-30 20:03:15'),
(2, 12, 'mobile_money', 3.45, '2026-03-30 20:53:12'),
(3, 15, 'cash',         3.45, '2026-03-30 20:54:17'),
(4, 30, 'cash',        10.00, '2026-04-02 16:32:58'),
(5, 31, 'mobile_money', 3.45, '2026-04-02 16:33:36');

-- paystack_transactions
INSERT OR IGNORE INTO paystack_transactions
  (id, reference, cashier_id, customer_id, amount, status, sale_id, cart_snapshot, tax, created_at, updated_at)
VALUES
(1,  'POS-1775473222086-c3771e5e', 1, NULL, 17.00, 'pending', NULL, '[{"product_id":17,"product_name":"Chocolate Bar","price":"2.00","quantity":1,"subtotal":2},{"product_id":23,"product_name":"Laundry Detergent","price":"15.00","quantity":1,"subtotal":15}]', 0.00, '2026-04-06 11:00:22', '2026-04-06 11:00:22'),
(2,  'POS-1775473481805-2d4a0394', 1, NULL, 17.00, 'failed',  NULL, '[{"product_id":17,"product_name":"Chocolate Bar","price":"2.00","quantity":1,"subtotal":2},{"product_id":23,"product_name":"Laundry Detergent","price":"15.00","quantity":1,"subtotal":15}]', 0.00, '2026-04-06 11:04:41', '2026-04-06 11:04:42'),
(3,  'POS-1775473586108-0cd02617', 1, NULL, 17.00, 'failed',  NULL, '[{"product_id":17,"product_name":"Chocolate Bar","price":"2.00","quantity":1,"subtotal":2},{"product_id":23,"product_name":"Laundry Detergent","price":"15.00","quantity":1,"subtotal":15}]', 0.00, '2026-04-06 11:06:26', '2026-04-06 11:06:26'),
(4,  'POS-1775473642581-83cab4ae', 1, NULL, 12.00, 'failed',  NULL, '[{"product_id":22,"product_name":"Toilet Paper Pack","price":"12.00","quantity":1,"subtotal":12}]',                                                                                                 0.00, '2026-04-06 11:07:22', '2026-04-06 11:07:23'),
(5,  'POS-1775473760420-ffa7531d', 1, NULL,  3.00, 'failed',  NULL, '[{"product_id":16,"product_name":"Lays Chips","price":"3.00","quantity":1,"subtotal":3}]',                                                                                                             0.00, '2026-04-06 11:09:20', '2026-04-06 11:09:29'),
(6,  'POS-1775473899849-f6707b51', 1, NULL,  3.00, 'failed',  NULL, '[{"product_id":16,"product_name":"Lays Chips","price":"3.00","quantity":1,"subtotal":3}]',                                                                                                             0.00, '2026-04-06 11:11:39', '2026-04-06 11:11:51'),
(7,  'POS-1775473963618-f7399db5', 1, NULL,  3.20, 'failed',  NULL, '[{"product_id":21,"product_name":"Yogurt Cup","price":"3.20","quantity":1,"subtotal":3.2}]',                                                                                                           0.00, '2026-04-06 11:12:43', '2026-04-06 11:12:48'),
(8,  'POS-1775474008455-1a2b3759', 1, NULL,  2.00, 'pending', NULL, '[{"product_id":17,"product_name":"Chocolate Bar","price":"2.00","quantity":1,"subtotal":2}]',                                                                                                          0.00, '2026-04-06 11:13:28', '2026-04-06 11:13:28'),
(9,  'POS-1775474039590-5e777f68', 1, NULL,  2.00, 'pending', NULL, '[{"product_id":17,"product_name":"Chocolate Bar","price":"2.00","quantity":1,"subtotal":2}]',                                                                                                          0.00, '2026-04-06 11:13:59', '2026-04-06 11:13:59'),
(10, 'POS-1775474258902-8dd1d431', 1, NULL, 15.00, 'pending', NULL, '[{"product_id":23,"product_name":"Laundry Detergent","price":"15.00","quantity":1,"subtotal":15}]',                                                                                                    0.00, '2026-04-06 11:17:38', '2026-04-06 11:17:38'),
(11, 'POS-1775474315524-6fd550f7', 1, NULL, 15.00, 'pending', NULL, '[{"product_id":23,"product_name":"Laundry Detergent","price":"15.00","quantity":1,"subtotal":15}]',                                                                                                    0.00, '2026-04-06 11:18:35', '2026-04-06 11:18:35'),
(12, 'POS-1775476088057-b5ad75e0', 1, NULL, 12.00, 'failed',  NULL, '[{"product_id":22,"product_name":"Toilet Paper Pack","price":"12.00","quantity":1,"subtotal":12}]',                                                                                                   0.00, '2026-04-06 11:48:08', '2026-04-06 11:48:08'),
(13, 'POS-1775477034760-c9330208', 1, NULL,  1.20, 'failed',  NULL, '[{"product_id":15,"product_name":"Salt 500g","price":"1.20","quantity":1,"subtotal":1.2}]',                                                                                                            0.00, '2026-04-06 12:03:54', '2026-04-06 12:03:55'),
(14, 'POS-1775477139002-ae55a076', 1, NULL,  8.50, 'failed',  NULL, '[{"product_id":20,"product_name":"Cheese Block","price":"8.50","quantity":1,"subtotal":8.5}]',                                                                                                         0.00, '2026-04-06 12:05:39', '2026-04-06 12:05:40'),
(15, 'POS-1775477289635-3af3a3e7', 1, NULL,  8.50, 'pending', NULL, '[{"product_id":20,"product_name":"Cheese Block","price":"8.50","quantity":1,"subtotal":8.5}]',                                                                                                         0.00, '2026-04-06 12:08:09', '2026-04-06 12:08:09'),
(16, 'POS-1775478290679-5e82da5b', 1, NULL,  2.30, 'failed',  NULL, '[{"product_id":26,"product_name":"Bar Soap","price":"2.00","quantity":1,"subtotal":2}]',                                                                                                               0.30, '2026-04-06 12:24:50', '2026-04-06 12:24:51'),
(17, 'POS-1775478347348-9c9fa3c9', 1, NULL,  4.03, 'pending', NULL, '[{"product_id":28,"product_name":"Notebook A5","price":"3.50","quantity":1,"subtotal":3.5}]',                                                                                                          0.53, '2026-04-06 12:25:47', '2026-04-06 12:25:47'),
(18, 'POS-1775478562616-fda78a6d', 1, NULL,  2.53, 'failed',  NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1},{"product_id":15,"product_name":"Salt 500g","price":"1.20","quantity":1,"subtotal":1.2}]',                            0.33, '2026-04-06 12:29:22', '2026-04-06 12:29:23'),
(19, 'POS-1775478606132-2f3cf445', 1, NULL,  1.15, 'failed',  NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                                   0.15, '2026-04-06 12:30:06', '2026-04-06 12:30:06'),
(20, 'POS-1775478610336-8f29ff42', 1, NULL,  1.15, 'failed',  NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                                   0.15, '2026-04-06 12:30:10', '2026-04-06 12:30:10'),
(21, 'POS-1775478627323-d89066d8', 1, NULL,  1.15, 'failed',  NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                                   0.15, '2026-04-06 12:30:27', '2026-04-06 12:30:28'),
(22, 'POS-1775478749569-a706b53d', 1, NULL,  1.15, 'failed',  NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                                   0.15, '2026-04-06 12:32:29', '2026-04-06 12:32:34'),
(23, 'POS-1775478947316-293d5249', 1, NULL,  1.15, 'failed',  NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                                   0.15, '2026-04-06 12:35:47', '2026-04-06 12:35:51'),
(24, 'POS-1775479054492-0fac954b', 1, NULL,  1.15, 'failed',  NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                                   0.15, '2026-04-06 12:37:34', '2026-04-06 12:37:38'),
(25, 'POS-1775596038951-6572b711', 1, NULL, 17.25, 'pending', NULL, '[{"product_id":16,"product_name":"Lays Chips","price":"3.00","quantity":1,"subtotal":3},{"product_id":22,"product_name":"Toilet Paper Pack","price":"12.00","quantity":1,"subtotal":12}]',              2.25, '2026-04-07 21:07:18', '2026-04-07 21:07:18'),
(26, 'POS-1775596077969-97ba86f8', 1, NULL, 17.25, 'pending', NULL, '[{"product_id":16,"product_name":"Lays Chips","price":"3.00","quantity":1,"subtotal":3},{"product_id":22,"product_name":"Toilet Paper Pack","price":"12.00","quantity":1,"subtotal":12}]',              2.25, '2026-04-07 21:07:57', '2026-04-07 21:07:57'),
(27, 'POS-1775596130055-3f269100', 1, NULL, 17.25, 'pending', NULL, '[{"product_id":16,"product_name":"Lays Chips","price":"3.00","quantity":1,"subtotal":3},{"product_id":22,"product_name":"Toilet Paper Pack","price":"12.00","quantity":1,"subtotal":12}]',              2.25, '2026-04-07 21:08:50', '2026-04-07 21:08:50'),
(28, 'POS-1775596133024-1cf2d46b', 1, NULL, 17.25, 'pending', NULL, '[{"product_id":16,"product_name":"Lays Chips","price":"3.00","quantity":1,"subtotal":3},{"product_id":22,"product_name":"Toilet Paper Pack","price":"12.00","quantity":1,"subtotal":12}]',              2.25, '2026-04-07 21:08:53', '2026-04-07 21:08:53'),
(29, 'POS-1775644275290-779da17a', 1, NULL,  4.83, 'failed',  NULL, '[{"product_id":15,"product_name":"Salt 500g","price":"1.20","quantity":1,"subtotal":1.2},{"product_id":16,"product_name":"Lays Chips","price":"3.00","quantity":1,"subtotal":3}]',                      0.63, '2026-04-08 10:31:15', '2026-04-08 10:31:20'),
(30, 'POS-1775644593302-5351d273', 1, NULL,  6.32, 'pending', NULL, '[{"product_id":26,"product_name":"Bar Soap","price":"2.00","quantity":1,"subtotal":2},{"product_id":28,"product_name":"Notebook A5","price":"3.50","quantity":1,"subtotal":3.5}]',                      0.82, '2026-04-08 10:36:33', '2026-04-08 10:36:33'),
(31, 'POS-1775644597599-71bf2e18', 1, NULL,  6.32, 'pending', NULL, '[{"product_id":26,"product_name":"Bar Soap","price":"2.00","quantity":1,"subtotal":2},{"product_id":28,"product_name":"Notebook A5","price":"3.50","quantity":1,"subtotal":3.5}]',                      0.82, '2026-04-08 10:36:37', '2026-04-08 10:36:37'),
(32, 'POS-1775729060602',          1, NULL,  4.20, 'pending', NULL, '[{"product_id":14,"product_name":"Sugar 1kg","price":"4.20","quantity":1,"subtotal":4.2}]',                                                                                                            0.00, '2026-04-09 10:04:20', '2026-04-09 10:04:20'),
(33, 'POS-1775729167304',          1, NULL, 10.50, 'pending', NULL, '[{"product_id":13,"product_name":"Cooking Oil 1L","price":"10.50","quantity":1,"subtotal":10.5}]',                                                                                                      0.00, '2026-04-09 10:06:07', '2026-04-09 10:06:07'),
(34, 'POS-1775729914231',          1, NULL, 10.50, 'pending', NULL, '[{"product_id":13,"product_name":"Cooking Oil 1L","price":"10.50","quantity":1,"subtotal":10.5}]',                                                                                                      0.00, '2026-04-09 10:18:34', '2026-04-09 10:18:34'),
(35, 'POS-1775730126496',          1, NULL,  1.00, 'pending', NULL, '[{"product_id":29,"product_name":"Ballpoint Pen","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                           0.00, '2026-04-09 10:22:06', '2026-04-09 10:22:06'),
(36, 'POS-1776286357352',          1, NULL,  1.00, 'pending', NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                                    0.00, '2026-04-15 20:52:37', '2026-04-15 20:52:37'),
(37, 'POS-1776286360320',          1, NULL,  1.00, 'pending', NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                                    0.00, '2026-04-15 20:52:40', '2026-04-15 20:52:40'),
(38, 'POS-1776286391077',          1, NULL,  1.00, 'pending', NULL, '[{"product_id":2,"product_name":"Water","price":"1.00","quantity":1,"subtotal":1}]',                                                                                                                    0.00, '2026-04-15 20:53:11', '2026-04-15 20:53:11');

PRAGMA foreign_keys = ON;
