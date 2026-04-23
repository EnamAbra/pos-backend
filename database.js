import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// DB_PATH env var lets you point at a Render persistent disk (e.g. /var/data/pos.db).
// Falls back to backend/database/pos.db for local development.
const path =
  process.env.RENDER
    ? "/tmp/pos.db"
    : "./database/pos.db";

const db = await open({
  filename: dbPath,
  driver:   sqlite3.Database,
});

await db.run('PRAGMA journal_mode = WAL');
await db.run('PRAGMA foreign_keys = ON');

// Auto-initialize schema on first run
await db.exec(`
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
`);

console.log('Connected to SQLite database ✅');

export default db;
