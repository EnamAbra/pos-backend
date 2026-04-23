// controllers/productController.js
import queryAsync from '../queryAsync.js';

// GET /products?search=cola&category=drinks
export const getAllProducts = async (req, res) => {
  const { search, category } = req.query;
  let sql = 'SELECT * FROM products';
  const params = [];
  const conditions = [];

  if (search) {
    // Array.push returns new length, which equals the $N position
    const p1 = params.push(`%${search}%`);
    const p2 = params.push(`%${search}%`);
    conditions.push(`(product_name ILIKE $${p1} OR barcode ILIKE $${p2})`);
  }
  if (category) {
    conditions.push(`category = $${params.push(category)}`);
  }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC';

  try {
    const products = await queryAsync(sql, params);
    res.json({ success: true, data: products });
  } catch (err) {
    console.error('getAllProducts error:', err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// GET /products/:id
export const getProductById = async (req, res) => {
  try {
    const rows = await queryAsync(
      'SELECT * FROM products WHERE product_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

// POST /products
export const createProduct = async (req, res) => {
  const { product_name, category, price, barcode } = req.body;

  if (!product_name || !price) {
    return res.status(400).json({ message: 'product_name and price are required' });
  }

  try {
    const result = await queryAsync(
      'INSERT INTO products (product_name, category, price, barcode) VALUES ($1, $2, $3, $4) RETURNING product_id',
      [product_name, category || null, price, barcode || null]
    );
    res.status(201).json({
      success: true,
      message: 'Product created',
      data: { product_id: result.insertId, product_name, category, price, barcode },
    });
  } catch (err) {
    if (err.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({ message: 'Barcode already exists' });
    }
    res.status(500).json({ message: 'Failed to create product' });
  }
};

// PUT /products/:id
export const updateProduct = async (req, res) => {
  const { product_name, category, price, barcode } = req.body;
  const fields = [];
  const params = [];

  // Array.push returns new length = correct $N index
  if (product_name !== undefined) fields.push(`product_name = $${params.push(product_name)}`);
  if (category !== undefined)     fields.push(`category = $${params.push(category)}`);
  if (price !== undefined)        fields.push(`price = $${params.push(price)}`);
  if (barcode !== undefined)      fields.push(`barcode = $${params.push(barcode)}`);

  if (fields.length === 0) {
    return res.status(400).json({ message: 'No fields provided to update' });
  }

  try {
    const result = await queryAsync(
      `UPDATE products SET ${fields.join(', ')} WHERE product_id = $${params.push(req.params.id)}`,
      params
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true, message: 'Product updated' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Barcode already exists' });
    }
    res.status(500).json({ message: 'Failed to update product' });
  }
};

// DELETE /products/:id
export const deleteProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    const salesItems = await queryAsync(
      'SELECT 1 FROM sales_items WHERE product_id = $1 LIMIT 1',
      [productId]
    );
    if (salesItems.length > 0) {
      return res.status(400).json({ message: 'Cannot delete product: it has sales records' });
    }

    const result = await queryAsync(
      'DELETE FROM products WHERE product_id = $1',
      [productId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('deleteProduct error:', err);
    res.status(500).json({ message: 'Failed to delete product', error: err.message });
  }
};
