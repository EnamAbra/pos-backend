import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// DB path (Render-safe)
const dbPath = process.env.RENDER
  ? "/tmp/pos.db"
  : "./database/pos.db";

// open database using sqlite (pure JS wrapper)
const db = await open({
  filename: dbPath,
  driver: sqlite3.Database, // IMPORTANT: sqlite package still uses sqlite3 internally
});

export default db;