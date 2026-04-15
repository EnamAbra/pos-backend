// routes/inventoryRoutes.js
import express from 'express';
import { getAllInventory, updateStock } from '../controllers/InventoryController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /inventory — any logged-in user can view stock
router.get('/', authMiddleware, getAllInventory);

// PUT /inventory/:productId — only admin and manager can adjust stock
router.put('/:productId', authMiddleware, requireRole('admin', 'manager'), updateStock);

export default router;