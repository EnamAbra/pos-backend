/**
 * One-time migration: SQLite → PostgreSQL
 *
 * Usage:
 *   DATABASE_URL="postgres://..." SQLITE_PATH="./database/pos.db" node database/migrate_to_pg.js
 *
 * Requirements (dev only — already in devDependencies):
 *   npm install   (installs sqlite + sqlite3 from devDependencies)
 *
 * What it does:
 *   1. Reads every table from your SQLite file in FK-safe order
 *   2. Inserts rows into PostgreSQL preserving original IDs
 *   3. Resets all SERIAL sequences so future INSERTs don't collide
 */

import 'dotenv/config';
import { open }       from 'sqlite';
import sqlite3module  from 'sqlite3';
import pkg            from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────
const SQLITE_PATH = process.env.SQLITE_PATH || join(__dirname, 'pos.db');
const PG_URL      = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error('❌  DATABASE_URL is not set.');
  process.exit(1);
}

// ── Connections ──────────────────────────────────────────────
const sqlite = await open({ filename: SQLITE_PATH, driver: sqlite3module.Database });
const pg     = new Pool({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });

console.log('✅  Connected to SQLite:', SQLITE_PATH);
console.log('✅  Connected to PostgreSQL');

// ── Helpers ──────────────────────────────────────────────────
async function migrateTable(tableName, pgCols, pgTypes = {}) {
  const rows = await sqlite.all(`SELECT * FROM ${tableName}`);
  if (rows.length === 0) {
    console.log(`   ${tableName}: 0 rows — skipped`);
    return;
  }

  let inserted = 0;
  for (const row of rows) {
    const cols   = pgCols || Object.keys(row);
    const values = cols.map(c => {
      const v = row[c];
      if (v === null || v === undefined) return null;
      if (pgTypes[c] === 'json') return typeof v === 'string' ? v : JSON.stringify(v);
      return v;
    });
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    try {
      await pg.query(
        `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
      inserted++;
    } catch (err) {
      console.warn(`   ⚠️  ${tableName} row skipped (${err.message}):`, row);
    }
  }
  console.log(`   ${tableName}: ${inserted}/${rows.length} rows migrated`);
}

async function resetSequence(table, pkCol) {
  await pg.query(`
    SELECT setval(
      pg_get_serial_sequence('${table}', '${pkCol}'),
      COALESCE((SELECT MAX(${pkCol}) FROM ${table}), 0) + 1,
      false
    )
  `);
}

// ── Migration ────────────────────────────────────────────────
console.log('\n📦  Migrating tables…\n');

// Order matters — parents before children (FK constraints)
await migrateTable('users', ['user_id','username','password','role','created_at']);
await migrateTable('customers', ['customer_id','name','phone','email','loyalty_points','created_at']);
await migrateTable('products', ['product_id','product_name','category','price','barcode','created_at']);
await migrateTable('inventory', ['inventory_id','product_id','stock_quantity','last_updated']);
await migrateTable('sales', ['sale_id','cashier_id','customer_id','total_amount','status','sale_date']);
await migrateTable('sales_items', ['sale_item_id','sale_id','product_id','quantity','unit_price','subtotal']);
await migrateTable('payments', ['payment_id','sale_id','payment_method','amount','payment_date']);
await migrateTable('paystack_transactions', [
  'id','reference','cashier_id','customer_id','amount',
  'status','sale_id','cart_snapshot','tax','created_at','updated_at',
], { cart_snapshot: 'json' });

// ── Reset sequences ──────────────────────────────────────────
console.log('\n🔄  Resetting sequences…\n');

await resetSequence('users',                 'user_id');
await resetSequence('customers',             'customer_id');
await resetSequence('products',              'product_id');
await resetSequence('inventory',             'inventory_id');
await resetSequence('sales',                 'sale_id');
await resetSequence('sales_items',           'sale_item_id');
await resetSequence('payments',              'payment_id');
await resetSequence('paystack_transactions', 'id');

console.log('   Sequences reset ✅');

// ── Done ─────────────────────────────────────────────────────
await sqlite.close();
await pg.end();
console.log('\n🎉  Migration complete!\n');
