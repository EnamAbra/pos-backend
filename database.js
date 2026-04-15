import mysql from 'mysql2';

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "enam",
  database: "pos_system",
});

db.connect((err) => {
  if (err) {
    console.log("DB connection failed", err);
  } else {
    console.log("Connected to MySQL");
  }
});

export default db;   // ✅ ESM export