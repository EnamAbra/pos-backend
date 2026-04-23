import mysql from "mysql2/promise";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// ===== MYSQL CONNECTION =====
const mysqlConn = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "enam", // your MySQL password
  database: "pos_system",
});

// ===== SQLITE CONNECTION =====
const sqliteDb = await open({
  filename: "./database/pos.db",
  driver: sqlite3.Database,
});

console.log("🚀 Starting migration...");

// Enable foreign keys
await sqliteDb.exec("PRAGMA foreign_keys = ON;");

// Helper function
async function migrateTable(tableName) {
  console.log(`📦 Migrating ${tableName}...`);

  const [rows] = await mysqlConn.query(`SELECT * FROM ${tableName}`);

  if (rows.length === 0) {
    console.log(`⚠️ No data in ${tableName}`);
    return;
  }

  for (const row of rows) {
    const columns = Object.keys(row).join(",");
    const placeholders = Object.keys(row).map(() => "?").join(",");
    const values = Object.values(row);

    await sqliteDb.run(
      `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`,
      values
    );
  }

  console.log(`✅ ${tableName} migrated (${rows.length} rows)`);
}

// ===== LIST YOUR TABLES =====
const tables = [
  "users",
  "customers",
  "products",
  "inventory",
  "sales",
  "sales_items",
  "payments",
  "paystack_transactions"
];

// Run migration
for (const table of tables) {
  await migrateTable(table);
}

console.log("🎉 Migration completed!");

await mysqlConn.end();
await sqliteDb.close();