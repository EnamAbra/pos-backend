

import pkg from 'pg';
import 'dotenv/config';

const { Pool, types } = pkg;

// Return NUMERIC/DECIMAL as JS float (not string) — keeps arithmetic working across controllers
types.setTypeParser(1700, parseFloat);
// Return INT8/BIGINT as JS number (COUNT(*) returns bigint in pg)
types.setTypeParser(20, Number);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Fail fast if the database is unreachable at startup
const client = await pool.connect();
console.log('Connected to PostgreSQL ✅');
client.release();

// Auto-initialize schema on first deploy (idempotent — safe to run every startup)
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    user_id        SERIAL PRIMARY KEY,
    username       TEXT        NOT NULL UNIQUE,
    password       TEXT        NOT NULL,
    role           TEXT        NOT NULL CHECK(role IN ('admin', 'manager', 'cashier')),
    created_at     TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS customers (
    customer_id    SERIAL PRIMARY KEY,
    name           TEXT        NOT NULL,
    phone          TEXT,
    email          TEXT,
    loyalty_points INTEGER     DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS products (
    product_id     SERIAL PRIMARY KEY,
    product_name   TEXT           NOT NULL,
    category       TEXT,
    price          NUMERIC(10,2)  NOT NULL,
    barcode        TEXT           UNIQUE,
    created_at     TIMESTAMPTZ    DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS inventory (
    inventory_id   SERIAL PRIMARY KEY,
    product_id     INTEGER NOT NULL UNIQUE REFERENCES products(product_id) ON DELETE CASCADE,
    stock_quantity INTEGER DEFAULT 0,
    last_updated   TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS sales (
    sale_id        SERIAL PRIMARY KEY,
    cashier_id     INTEGER       NOT NULL REFERENCES users(user_id),
    customer_id    INTEGER       REFERENCES customers(customer_id),
    total_amount   NUMERIC(10,2) NOT NULL,
    status         TEXT          NOT NULL DEFAULT 'completed',
    sale_date      TIMESTAMPTZ   DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS sales_items (
    sale_item_id   SERIAL PRIMARY KEY,
    sale_id        INTEGER       NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    product_id     INTEGER       NOT NULL REFERENCES products(product_id),
    quantity       INTEGER       NOT NULL,
    unit_price     NUMERIC(10,2) NOT NULL,
    subtotal       NUMERIC(10,2) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    payment_id     SERIAL PRIMARY KEY,
    sale_id        INTEGER       NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    payment_method TEXT          NOT NULL CHECK(payment_method IN ('cash', 'mobile_money', 'card')),
    amount         NUMERIC(10,2) NOT NULL,
    payment_date   TIMESTAMPTZ   DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS paystack_transactions (
    id             SERIAL PRIMARY KEY,
    reference      TEXT          NOT NULL UNIQUE,
    cashier_id     INTEGER       NOT NULL REFERENCES users(user_id),
    customer_id    INTEGER       REFERENCES customers(customer_id),
    amount         NUMERIC(10,2) NOT NULL,
    status         TEXT          DEFAULT 'pending' CHECK(status IN ('pending', 'success', 'failed')),
    sale_id        INTEGER       REFERENCES sales(sale_id),
    cart_snapshot  TEXT          NOT NULL,
    tax            NUMERIC(10,2) DEFAULT 0.00,
    created_at     TIMESTAMPTZ   DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   DEFAULT NOW()
  );
`);

export default pool;
