// controllers/SalesController.js
import queryAsync from '../queryAsync.js';

/**
 * POST /sales  — supports single and split payments.
 *
 * Single:  { customer_id, payment_method: "cash", amount_paid: 25.00, items: [...] }
 * Split:   { customer_id, payments: [{ method: "cash", amount: 10 }, ...], items: [...] }
 */
export const createSale = async (req, res) => {
  const { customer_id, items, payment_method, amount_paid, payments: splitPayments } = req.body;
  const cashier_id = req.user.user_id;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  let paymentsList = [];
  if (splitPayments && Array.isArray(splitPayments)) {
    paymentsList = splitPayments;
  } else if (payment_method) {
    paymentsList = [{ method: payment_method, amount: amount_paid }];
  } else {
    return res.status(400).json({ message: 'Provide payment_method or payments array' });
  }

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
    // Step 1 — Validate products + calculate total server-side
    let total_amount = 0;
    const enrichedItems = [];

    for (const item of items) {
      const rows = await queryAsync(
        'SELECT product_id, product_name, price FROM products WHERE product_id = $1',
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

    // Step 2 — Validate payment covers total
    const totalPaid = paymentsList.reduce((s, p) => s + parseFloat(p.amount), 0);
    if (totalPaid < total_amount - 0.01) {
      return res.status(400).json({
        message: `Payment total (${totalPaid.toFixed(2)}) is less than sale total (${total_amount.toFixed(2)})`,
      });
    }

    // Step 3 — Create sale record
    const saleResult = await queryAsync(
      `INSERT INTO sales (cashier_id, customer_id, total_amount, status)
       VALUES ($1, $2, $3, 'completed') RETURNING sale_id`,
      [cashier_id, customer_id || null, total_amount]
    );
    const sale_id = saleResult.insertId;

    // Step 4 — Insert line items + deduct inventory
    for (const item of enrichedItems) {
      await queryAsync(
        `INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale_id, item.product_id, item.quantity, item.price, item.subtotal]
      );

      // $1 and $3 are both item.quantity — PostgreSQL requires distinct positions
      await queryAsync(
        `UPDATE inventory
         SET stock_quantity = stock_quantity - $1
         WHERE product_id = $2 AND stock_quantity >= $3`,
        [item.quantity, item.product_id, item.quantity]
      );
    }

    // Step 5 — Record all payments (one row per method)
    for (const p of paymentsList) {
      await queryAsync(
        'INSERT INTO payments (sale_id, payment_method, amount) VALUES ($1, $2, $3)',
        [sale_id, p.method, parseFloat(p.amount)]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Sale completed',
      data: {
        sale_id,
        total_amount,
        total_paid: totalPaid,
        change:     parseFloat((totalPaid - total_amount).toFixed(2)),
        payments:   paymentsList,
        items:      enrichedItems,
      },
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
       WHERE s.sale_id = $1`,
      [id]
    );
    if (!sales.length) return res.status(404).json({ message: 'Sale not found' });

    const items = await queryAsync(
      `SELECT si.*, p.product_name
       FROM sales_items si
       JOIN products p ON si.product_id = p.product_id
       WHERE si.sale_id = $1`,
      [id]
    );

    const payments = await queryAsync(
      'SELECT * FROM payments WHERE sale_id = $1 ORDER BY payment_date ASC',
      [id]
    );

    res.json({ success: true, data: { ...sales[0], items, payments } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sale' });
  }
};
