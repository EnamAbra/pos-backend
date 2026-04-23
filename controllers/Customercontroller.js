// controllers/customerController.js
import queryAsync from '../queryAsync.js';

// GET /customers
export const getAllCustomers = async (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM customers';
  const params = [];

  if (search) {
    const p1 = params.push(`%${search}%`);
    const p2 = params.push(`%${search}%`);
    const p3 = params.push(`%${search}%`);
    sql += ` WHERE name ILIKE $${p1} OR phone ILIKE $${p2} OR email ILIKE $${p3}`;
  }
  sql += ' ORDER BY created_at DESC';

  try {
    const rows = await queryAsync(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
};

// GET /customers/:id
export const getCustomerById = async (req, res) => {
  try {
    const rows = await queryAsync(
      'SELECT * FROM customers WHERE customer_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch customer' });
  }
};

// GET /customers/:id/history
export const getCustomerHistory = async (req, res) => {
  try {
    // STRING_AGG aggregates multiple payment methods per sale into one row,
    // preventing duplicates when a sale has split payments.
    const sales = await queryAsync(
      `SELECT
         s.sale_id,
         s.total_amount,
         s.status,
         s.sale_date,
         u.username AS cashier,
         p.payment_method
       FROM sales s
       LEFT JOIN users u ON s.cashier_id = u.user_id
       LEFT JOIN (
         SELECT sale_id, STRING_AGG(payment_method, ', ') AS payment_method
         FROM payments
         GROUP BY sale_id
       ) p ON p.sale_id = s.sale_id
       WHERE s.customer_id = $1
       ORDER BY s.sale_date DESC`,
      [req.params.id]
    );

    for (const sale of sales) {
      sale.items = await queryAsync(
        `SELECT si.quantity, si.unit_price, si.subtotal, pr.product_name
         FROM sales_items si
         JOIN products pr ON si.product_id = pr.product_id
         WHERE si.sale_id = $1`,
        [sale.sale_id]
      );
    }

    const totalSpent = sales.reduce((s, r) => s + Number(r.total_amount), 0);

    res.json({
      success: true,
      data: { sales, total_spent: totalSpent, total_orders: sales.length },
    });
  } catch (err) {
    console.error('getCustomerHistory error:', err);
    res.status(500).json({ message: 'Failed to fetch purchase history' });
  }
};

// POST /customers
export const createCustomer = async (req, res) => {
  const { name, phone, email } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  try {
    const result = await queryAsync(
      'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING customer_id',
      [name, phone || null, email || null]
    );
    res.status(201).json({
      success: true,
      message: 'Customer registered',
      data: { customer_id: result.insertId, name, phone, email, loyalty_points: 0 },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to register customer' });
  }
};

// PUT /customers/:id
export const updateCustomer = async (req, res) => {
  const { name, phone, email, loyalty_points } = req.body;
  const fields = [];
  const params = [];

  if (name !== undefined)           fields.push(`name = $${params.push(name)}`);
  if (phone !== undefined)          fields.push(`phone = $${params.push(phone)}`);
  if (email !== undefined)          fields.push(`email = $${params.push(email)}`);
  if (loyalty_points !== undefined) fields.push(`loyalty_points = $${params.push(loyalty_points)}`);

  if (!fields.length) return res.status(400).json({ message: 'No fields to update' });

  try {
    const result = await queryAsync(
      `UPDATE customers SET ${fields.join(', ')} WHERE customer_id = $${params.push(req.params.id)}`,
      params
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, message: 'Customer updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update customer' });
  }
};

// DELETE /customers/:id
export const deleteCustomer = async (req, res) => {
  try {
    const result = await queryAsync(
      'DELETE FROM customers WHERE customer_id = $1',
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete customer' });
  }
};
