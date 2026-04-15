// controllers/inventoryController.js
import queryAsync from '../queryAsync.js';

// GET /inventory — all products with their stock levels
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
// Body: { quantity } to set absolute value
// Body: { adjustment: 10 } to add/subtract (positive = add, negative = remove)
export const updateStock = async (req, res) => {
  const { productId } = req.params;
  const { quantity, adjustment, reason } = req.body;

  // Must provide either quantity (absolute set) or adjustment (relative change)
  if (quantity === undefined && adjustment === undefined) {
    return res.status(400).json({ message: 'Provide either quantity (absolute) or adjustment (relative)' });
  }

  try {
    // Check product exists
    const product = await queryAsync(
      'SELECT product_id, product_name FROM products WHERE product_id = ?',
      [productId]
    );
    if (!product.length) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if inventory row exists
    const existing = await queryAsync(
      'SELECT * FROM inventory WHERE product_id = ?',
      [productId]
    );

    let newQuantity;

    if (existing.length === 0) {
      // No inventory row yet — create it
      newQuantity = quantity !== undefined
        ? Math.max(0, parseInt(quantity))
        : Math.max(0, parseInt(adjustment) || 0);

      await queryAsync(
        'INSERT INTO inventory (product_id, quantity) VALUES (?, ?)',
        [productId, newQuantity]
      );
    } else {
      // Update existing row
      if (quantity !== undefined) {
        // Absolute set
        newQuantity = Math.max(0, parseInt(quantity));
        await queryAsync(
          'UPDATE inventory SET quantity = ? WHERE product_id = ?',
          [newQuantity, productId]
        );
      } else {
        // Relative adjustment
        newQuantity = Math.max(0, existing[0].quantity + parseInt(adjustment));
        await queryAsync(
          'UPDATE inventory SET quantity = ? WHERE product_id = ?',
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
        reason:       reason || null
      }
    });
  } catch (err) {
    console.error('updateStock error:', err);
    res.status(500).json({ message: 'Failed to update stock' });
  }
};