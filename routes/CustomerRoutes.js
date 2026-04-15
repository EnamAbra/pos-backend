// routes/customerRoutes.js
import express from 'express';
import {
  getAllCustomers, getCustomerById, getCustomerHistory,
  createCustomer, updateCustomer, deleteCustomer
} from '../controllers/Customercontroller.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/',              getAllCustomers);                            // GET  /customers
router.get('/:id',           getCustomerById);                           // GET  /customers/5
router.get('/:id/history',   getCustomerHistory);                        // GET  /customers/5/history
router.post('/',             createCustomer);                             // POST /customers
router.put('/:id',           requireRole('admin','manager'), updateCustomer);   // PUT  /customers/5
router.delete('/:id',        requireRole('admin'), deleteCustomer);      // DELETE /customers/5

export default router;