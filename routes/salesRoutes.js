// routes/salesRoutes.js
import express from 'express';
import { createSale, getAllSales, getSaleById } from '../controllers/SalesController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware); // all sales routes require login

router.get('/', getAllSales);           // GET  /sales
router.get('/:id', getSaleById);        // GET  /sales/:id
router.post('/', createSale);           // POST /sales


export default router;