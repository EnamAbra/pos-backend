// routes/reportsRoutes.js
import express from 'express';
import { getDailySales, getTopProducts, getInventory, getSummary } from '../controllers/Reportscontroller.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only admin and manager can view reports
router.use(authMiddleware, requireRole('admin', 'manager'));

router.get('/summary',       getSummary);       // GET /reports/summary
router.get('/daily-sales',   getDailySales);    // GET /reports/daily-sales?days=7
router.get('/top-products',  getTopProducts);   // GET /reports/top-products?limit=10
router.get('/inventory',     getInventory);     // GET /reports/inventory

export default router;