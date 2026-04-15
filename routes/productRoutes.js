// routes/productRoutes.js
import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public-ish reads (still need login)
router.get('/',    authMiddleware, getAllProducts);   // GET  /products
router.get('/:id', authMiddleware, getProductById);  // GET  /products/:id

// Writes — admin or manager only
router.post('/',    authMiddleware, requireRole('admin', 'manager'), createProduct);  // POST   /products
router.put('/:id',  authMiddleware, requireRole('admin', 'manager'), updateProduct);  // PUT    /products/:id
router.delete('/:id', authMiddleware, requireRole('admin'),          deleteProduct);  // DELETE /products/:id

export default router;