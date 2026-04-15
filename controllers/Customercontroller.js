// controllers/customerController.js
import queryAsync from '../queryAsync.js';

// GET /customers — all customers
export const getAllCustomers = async (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM customers';
  const params = [];
  if (search) {
    sql += ' WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';
  try {
    const rows = await queryAsync(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
};

// GET /customers/:id — single customer
export const getCustomerById = async (req, res) => {
  try {
    const rows = await queryAsync('SELECT * FROM customers WHERE customer_id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch customer' });
  }
};

// GET /customers/:id/history — purchase history for a customer
export const getCustomerHistory = async (req, res) => {
  try {
    const sales = await queryAsync(
      `SELECT
         s.sale_id,
         s.total_amount,
         s.status,
         s.created_at,
         u.username AS cashier,
         p.method   AS payment_method
       FROM sales s
       LEFT JOIN users    u ON s.cashier_id = u.user_id
       LEFT JOIN payments p ON p.sale_id    = s.sale_id
       WHERE s.customer_id = ?
       ORDER BY s.created_at DESC`,
      [req.params.id]
    );

    // For each sale, get its items
    for (const sale of sales) {
      sale.items = await queryAsync(
        `SELECT si.quantity, si.unit_price, si.subtotal, p.product_name
         FROM sale_items si
         JOIN products p ON si.product_id = p.product_id
         WHERE si.sale_id = ?`,
        [sale.sale_id]
      );
    }

    const totalSpent = sales.reduce((s, r) => s + Number(r.total_amount), 0);

    res.json({
      success: true,
      data: { sales, total_spent: totalSpent, total_orders: sales.length }
    });
  } catch (err) {
    console.error('getCustomerHistory error:', err);
    res.status(500).json({ message: 'Failed to fetch purchase history' });
  }
};

// POST /customers — register new customer
export const createCustomer = async (req, res) => {
  const { name, phone, email } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  try {
    const result = await queryAsync(
      'INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)',
      [name, phone || null, email || null]
    );
    res.status(201).json({
      success: true,
      message: 'Customer registered',
      data: { customer_id: result.insertId, name, phone, email, loyalty_points: 0 }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to register customer' });
  }
};

// PUT /customers/:id — update customer info
export const updateCustomer = async (req, res) => {
  const { name, phone, email, loyalty_points } = req.body;
  const fields = [], params = [];
  if (name !== undefined)           { fields.push('name = ?');           params.push(name); }
  if (phone !== undefined)          { fields.push('phone = ?');          params.push(phone); }
  if (email !== undefined)          { fields.push('email = ?');          params.push(email); }
  if (loyalty_points !== undefined) { fields.push('loyalty_points = ?'); params.push(loyalty_points); }
  if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
  params.push(req.params.id);
  try {
    const result = await queryAsync(
      `UPDATE customers SET ${fields.join(', ')} WHERE customer_id = ?`, params
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
    const result = await queryAsync('DELETE FROM customers WHERE customer_id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete customer' });
  }
};