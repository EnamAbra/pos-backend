// controllers/inventoryController.js
import queryAsync from '../queryAsync.js';

// GET /inventory — all products with current stock levels
export const getAllInventory = async (req, res) => {
  try {
    const rows = await queryAsync(
      `SELECT
         p.product_id,
         p.product_name,
         p.category,
         p.price,
         p.barcode,
         COALESCE(i.stock_quantity, 0) AS quantity,
         CASE WHEN COALESCE(i.stock_quantity, 0) <= 5 THEN 1 ELSE 0 END AS low_stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.product_id
       ORDER BY low_stock DESC, p.product_name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getAllInventory error:', err);
    res.status(500).json({ message: 'Failed to fetch inventory' });
  }
};

// PUT /inventory/:productId — set or adjust stock level
// Body: { quantity }    → absolute set
// Body: { adjustment }  → relative change (positive or negative)
export const updateStock = async (req, res) => {
  const { productId } = req.params;
  const { quantity, adjustment, reason } = req.body;

  if (quantity === undefined && adjustment === undefined) {
    return res.status(400).json({ message: 'Provide either quantity (absolute) or adjustment (relative)' });
  }

  try {
    const product = await queryAsync(
      'SELECT product_id, product_name FROM products WHERE product_id = $1',
      [productId]
    );
    if (!product.length) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const existing = await queryAsync(
      'SELECT * FROM inventory WHERE product_id = $1',
      [productId]
    );

    let newQuantity;

    if (existing.length === 0) {
      newQuantity = quantity !== undefined
        ? Math.max(0, parseInt(quantity))
        : Math.max(0, parseInt(adjustment) || 0);

      await queryAsync(
        'INSERT INTO inventory (product_id, stock_quantity) VALUES ($1, $2)',
        [productId, newQuantity]
      );
    } else {
      if (quantity !== undefined) {
        newQuantity = Math.max(0, parseInt(quantity));
        await queryAsync(
          'UPDATE inventory SET stock_quantity = $1, last_updated = NOW() WHERE product_id = $2',
          [newQuantity, productId]
        );
      } else {
        newQuantity = Math.max(0, existing[0].stock_quantity + parseInt(adjustment));
        await queryAsync(
          'UPDATE inventory SET stock_quantity = $1, last_updated = NOW() WHERE product_id = $2',
          [newQuantity, productId]
        );
      }
    }

    res.json({
      success: true,
      message: 'Stock updated',
      data: {
        product_id:   parseInt(productId),
        product_name: product[0].product_name,
        new_quantity: newQuantity,
        low_stock:    newQuantity <= 5,
        reason:       reason || null,
      },
    });
  } catch (err) {
    console.error('updateStock error:', err);
    res.status(500).json({ message: 'Failed to update stock' });
  }
};
