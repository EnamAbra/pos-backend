// routes/paystackRoutes.js
import express from 'express';
import { initiateMomoPayment, verifyMomoPayment, paystackWebhook } from '../controllers/PaystackController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── WEBHOOK — must capture raw body for HMAC verification ────
// This route MUST be registered BEFORE express.json() parses the body.
// We use a custom rawBody capture middleware here.
router.post(
  '/momo/webhook',
  express.raw({ type: 'application/json' }),  // capture raw bytes
  (req, res, next) => {
    // Save the raw buffer as a string for HMAC verification
    req.rawBody = req.body.toString('utf8');
    // Parse body for event processing
    try { req.body = JSON.parse(req.rawBody); } catch { req.body = {}; }
    next();
  },
  paystackWebhook
);

// ── AUTHENTICATED ROUTES ──────────────────────────────────────
// POST /payments/momo/initiate — cashier starts a MoMo charge
router.post('/momo/initiate', authMiddleware, initiateMomoPayment);

// GET /payments/momo/verify/:reference — poll for payment status
router.get('/momo/verify/:reference', authMiddleware, verifyMomoPayment);

export default router;