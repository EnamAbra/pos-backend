// controllers/reportsController.js
import queryAsync from '../queryAsync.js';

// GET /reports/daily-sales?days=7
export const getDailySales = async (req, res) => {
  const days = parseInt(req.query.days) || 7;

  // Compute cutoff in JS to avoid any DB-specific date arithmetic
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const rows = await queryAsync(
      `SELECT
         sale_date::date        AS sale_date,
         COUNT(*)               AS total_orders,
         SUM(total_amount)      AS total_revenue,
         AVG(total_amount)      AS avg_order_value
       FROM sales
       WHERE sale_date::date >= $1::date
         AND status = 'completed'
       GROUP BY sale_date::date
       ORDER BY sale_date::date ASC`,
      [cutoffStr]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getDailySales error:', err);
    res.status(500).json({ message: 'Failed to fetch daily sales' });
  }
};

// GET /reports/top-products?limit=10
export const getTopProducts = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const rows = await queryAsync(
      `SELECT
         p.product_id,
         p.product_name,
         p.category,
         p.price,
         SUM(si.quantity)  AS total_sold,
         SUM(si.subtotal)  AS total_revenue
       FROM sales_items si
       JOIN products p ON si.product_id = p.product_id
       JOIN sales    s ON si.sale_id    = s.sale_id
       WHERE s.status = 'completed'
       GROUP BY p.product_id, p.product_name, p.category, p.price
       ORDER BY total_sold DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getTopProducts error:', err);
    res.status(500).json({ message: 'Failed to fetch top products' });
  }
};

// GET /reports/inventory
export const getInventory = async (req, res) => {
  try {
    const rows = await queryAsync(
      `SELECT
         p.product_id,
         p.product_name,
         p.category,
         p.price,
         p.barcode,
         COALESCE(i.stock_quantity, 0) AS stock,
         CASE WHEN COALESCE(i.stock_quantity, 0) <= 5 THEN 1 ELSE 0 END AS low_stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.product_id
       ORDER BY low_stock DESC, p.product_name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getInventory error:', err);
    res.status(500).json({ message: 'Failed to fetch inventory' });
  }
};

// GET /reports/summary
export const getSummary = async (req, res) => {
  try {
    // CURRENT_DATE is PostgreSQL's equivalent of SQLite's DATE('now')
    const [todayRow] = await queryAsync(
      `SELECT
         COALESCE(SUM(total_amount), 0) AS today_revenue,
         COUNT(*)                        AS today_orders
       FROM sales
       WHERE sale_date::date = CURRENT_DATE
         AND status = 'completed'`
    );

    const [totalRow] = await queryAsync(
      `SELECT
         COALESCE(SUM(total_amount), 0) AS all_time_revenue,
         COUNT(*)                        AS all_time_orders
       FROM sales
       WHERE status = 'completed'`
    );

    const [stockRow] = await queryAsync(
      `SELECT COUNT(*) AS low_stock_count
       FROM inventory
       WHERE stock_quantity <= 5`
    );

    res.json({
      success: true,
      data: {
        today_revenue:    todayRow.today_revenue,
        today_orders:     Number(todayRow.today_orders),
        all_time_revenue: totalRow.all_time_revenue,
        all_time_orders:  Number(totalRow.all_time_orders),
        low_stock_count:  Number(stockRow.low_stock_count),
      },
    });
  } catch (err) {
    console.error('getSummary error:', err);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
};
