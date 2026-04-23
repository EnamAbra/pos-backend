// controllers/SalesController.js
import queryAsync from '../queryAsync.js';

/**
 * POST /sales
 *
 * Supports both single and split payments.
 *
 * Single payment body:
 *   { customer_id, payment_method: "cash", amount_paid: 25.00, items: [...] }
 *
 * Split payment body:
 *   { customer_id, payments: [ { method: "cash", amount: 10 }, { method: "mobile_money", amount: 15 } ], items: [...] }
 */
export const createSale = async (req, res) => {
  const { customer_id, items, payment_method, amount_paid, payments: splitPayments } = req.body;
  const cashier_id = req.user.user_id;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  // Normalise: convert single-payment format into the same array format as split
  let paymentsList = [];

  if (splitPayments && Array.isArray(splitPayments)) {
    paymentsList = splitPayments;
  } else if (payment_method) {
    paymentsList = [{ method: payment_method, amount: amount_paid }];
  } else {
    return res.status(400).json({ message: 'Provide payment_method or payments array' });
  }

  // Validate payment methods
  const validMethods = ['cash', 'mobile_money', 'card'];
  for (const p of paymentsList) {
    if (!validMethods.includes(p.method)) {
      return res.status(400).json({ message: `Invalid payment method: ${p.method}` });
    }
    if (!p.amount || parseFloat(p.amount) <= 0) {
      return res.status(400).json({ message: `Invalid amount for method: ${p.method}` });
    }
  }

  try {
    // Step 1 — Validate products + calculate total server-side (never trust frontend prices)
    let total_amount = 0;
    const enrichedItems = [];

    for (const item of items) {
      const rows = await queryAsync(
        'SELECT product_id, product_name, price FROM products WHERE product_id = ?',
        [item.product_id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: `Product ID ${item.product_id} not found` });
      }
      const product = rows[0];
      const subtotal = product.price * item.quantity;
      total_amount += subtotal;
      enrichedItems.push({ ...product, quantity: item.quantity, subtotal });
    }

    // Step 2 — Validate payments cover the total (allow small rounding tolerance)
    const totalPaid = paymentsList.reduce((s, p) => s + parseFloat(p.amount), 0);
    if (totalPaid < total_amount - 0.01) {
      return res.status(400).json({
        message: `Payment total (${totalPaid.toFixed(2)}) is less than sale total (${total_amount.toFixed(2)})`
      });
    }

    // Step 3 — Create sale record
    const saleResult = await queryAsync(
      `INSERT INTO sales (cashier_id, customer_id, total_amount, status)
       VALUES (?, ?, ?, 'completed')`,
      [cashier_id, customer_id || null, total_amount]
    );
    const sale_id = saleResult.insertId;

    // Step 4 — Insert each item into sale_items AND deduct from inventory
    // BUG FIX: the INSERT into sale_items was missing entirely, and the
    // inventory column was wrongly named stock_quantity — correct name is quantity
    for (const item of enrichedItems) {
      await queryAsync(
        `INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [sale_id, item.product_id, item.quantity, item.price, item.subtotal]
      );

      await queryAsync(
  `UPDATE inventory 
   SET stock_quantity = stock_quantity - ? 
   WHERE product_id = ? AND stock_quantity >= ?`,
  [item.quantity, item.product_id, item.quantity]
);
    }

    // Step 5 — Record ALL payments (one row per method, supports split payments)
    for (const p of paymentsList) {
      await queryAsync(
        'INSERT INTO payments (sale_id, payment_method, amount) VALUES (?, ?, ?)',
        [sale_id, p.method, parseFloat(p.amount)]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Sale completed',
      data: {
        sale_id,
        total_amount,
        total_paid:   totalPaid,
        change:       parseFloat((totalPaid - total_amount).toFixed(2)),
        payments:     paymentsList,
        items:        enrichedItems
      }
    });

  } catch (err) {
    console.error('createSale error:', err);
    res.status(500).json({ message: 'Failed to process sale' });
  }
};

// GET /sales — all sales, most recent first
export const getAllSales = async (req, res) => {
  try {
    const sales = await queryAsync(
      `SELECT s.sale_id, s.total_amount, s.status, s.sale_date,
              u.username AS cashier,
              c.name     AS customer
       FROM sales s
       LEFT JOIN users     u ON s.cashier_id  = u.user_id
       LEFT JOIN customers c ON s.customer_id = c.customer_id
       ORDER BY s.sale_date DESC`
    );
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sales' });
  }
};

// GET /sales/:id — single sale with items and all payments
export const getSaleById = async (req, res) => {
  const { id } = req.params;
  try {
    const sales = await queryAsync(
      `SELECT s.*, u.username AS cashier, c.name AS customer
       FROM sales s
       LEFT JOIN users     u ON s.cashier_id  = u.user_id
       LEFT JOIN customers c ON s.customer_id = c.customer_id
       WHERE s.sale_id = ?`,
      [id]
    );
    if (!sales.length) return res.status(404).json({ message: 'Sale not found' });

    // BUG FIX: table was wrongly named sales_items — correct name is sale_items
    const items = await queryAsync(
      `SELECT si.*, p.product_name
       FROM sales_items si
       JOIN products p ON si.product_id = p.product_id
       WHERE si.sale_id = ?`,
      [id]
    );

    // Returns ALL payment rows — important for split payments
    const payments = await queryAsync(
      'SELECT * FROM payments WHERE sale_id = ? ORDER BY payment_date ASC',
      [id]
    );

    res.json({ success: true, data: { ...sales[0], items, payments } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sale' });
  }
};