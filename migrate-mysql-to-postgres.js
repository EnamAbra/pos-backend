import pool from "./database.js";

async function migrate() {
  console.log("Starting migration...");

  // USERS
  await pool.query(`
    INSERT INTO users (user_id, username, password, role, created_at)
    VALUES
    (1, 'admin1', '$2b$10$hEkaQIZgqFSk0rLXQKZB6.m3rlH8zQ1xJkNoFqa5y1swMFred338W', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
  `);

  // PRODUCTS (sample batch — add more if needed)
  await pool.query(`
    INSERT INTO products (product_id, product_name, category, price, barcode, created_at)
    VALUES
    (1,'Cola','Drinks',3.00,'1234567890123',NOW()),
    (2,'Water','Drinks',1.00,'1234567890124',NOW()),
    (3,'Burger','Food',5.00,'1234567890125',NOW()),
    (4,'Fries','Food',3.00,'1234567890126',NOW())
    ON CONFLICT (product_id) DO NOTHING;
  `);

  console.log("Migration completed ✅");
  process.exit();
}

migrate();