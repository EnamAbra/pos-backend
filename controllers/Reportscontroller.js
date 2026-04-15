// controllers/reportsController.js
import queryAsync from '../queryAsync.js';

// GET /reports/daily-sales?days=7
// Returns total sales per day for the last N days
export const getDailySales = async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  try {
    const rows = await queryAsync(
      `SELECT
         DATE(created_at)          AS sale_date,
         COUNT(*)                  AS total_orders,
         SUM(total_amount)         AS total_revenue,
         AVG(total_amount)         AS avg_order_value
       FROM sales
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND status = 'completed'
       GROUP BY DATE(created_at)
       ORDER BY sale_date ASC`,
      [days]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getDailySales error:', err);
    res.status(500).json({ message: 'Failed to fetch daily sales' });
  }
};

// GET /reports/top-products?limit=10
// Returns best selling products by quantity sold
export const getTopProducts = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const rows = await queryAsync(
      `SELECT
         p.product_id,
         p.product_name,
         p.category,
         p.price,
         SUM(si.quantity)           AS total_sold,
         SUM(si.subtotal)           AS total_revenue
       FROM sale_items si
       JOIN products p ON si.product_id = p.product_id
       JOIN sales s    ON si.sale_id    = s.sale_id
       WHERE s.status = 'completed'
       GROUP BY p.product_id, p.product_name, p.category, p.price
       ORDER BY total_sold DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getTopProducts error:', err);
    res.status(500).json({ message: 'Failed to fetch top products' });
  }
};

// GET /reports/inventory
// Returns all products with their stock level and a low-stock flag
export const getInventory = async (req, res) => {
  try {
    const rows = await queryAsync(
      `SELECT
         p.product_id,
         p.product_name,
         p.category,
         p.price,
         p.barcode,
         COALESCE(i.quantity, 0)    AS stock,
         CASE WHEN COALESCE(i.quantity, 0) <= 5 THEN 1 ELSE 0 END AS low_stock
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
// Returns headline numbers: today's revenue, total sales, low stock count
export const getSummary = async (req, res) => {
  try {
    const [todayRow] = await queryAsync(
      `SELECT
         COALESCE(SUM(total_amount), 0) AS today_revenue,
         COUNT(*)                        AS today_orders
       FROM sales
       WHERE DATE(created_at) = CURDATE() AND status = 'completed'`
    );

    const [totalRow] = await queryAsync(
      `SELECT
         COALESCE(SUM(total_amount), 0) AS all_time_revenue,
         COUNT(*)                        AS all_time_orders
       FROM sales WHERE status = 'completed'`
    );

    const [stockRow] = await queryAsync(
      `SELECT COUNT(*) AS low_stock_count
       FROM inventory WHERE quantity <= 5`
    );

    res.json({
      success: true,
      data: {
        today_revenue:    todayRow.today_revenue,
        today_orders:     todayRow.today_orders,
        all_time_revenue: totalRow.all_time_revenue,
        all_time_orders:  totalRow.all_time_orders,
        low_stock_count:  stockRow.low_stock_count
      }
    });
  } catch (err) {
    console.error('getSummary error:', err);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
};