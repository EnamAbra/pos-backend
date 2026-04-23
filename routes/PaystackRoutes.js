// routes/paystackRoutes.js
import express from 'express';
import { initiateMomoPayment, verifyMomoPayment, paystackWebhook } from '../controllers/PaystackController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Webhook — no auth needed; Paystack signs requests with HMAC-SHA512.
// req.rawBody is populated by the express.json verify hook in app.js,
// so no separate express.raw() middleware is needed here.
router.post('/momo/webhook', paystackWebhook);

// Authenticated routes
router.post('/momo/initiate',         authMiddleware, initiateMomoPayment);
router.get('/momo/verify/:reference', authMiddleware, verifyMomoPayment);

export default router;
