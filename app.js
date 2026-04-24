import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes      from './routes/authRoutes.js';
import productRoutes   from './routes/productRoutes.js';
import salesRoutes     from './routes/salesRoutes.js';
import inventoryRoutes from './routes/Inventoryroutes.js';
import customerRoutes  from './routes/CustomerRoutes.js';
import reportsRoutes   from './routes/reportsRoutes.js';
import paystackRoutes  from './routes/PaystackRoutes.js';

const app = express();

// ── CORS ─────────────────────────────────────────────────────
const corsOptions = {
  origin: [
    'https://pos-frontend-ten-pi.vercel.app',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle all preflight requests

// ── Body parsing ─────────────────────────────────────────────
// verify captures raw bytes for Paystack HMAC webhook verification
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

// ── Routes ───────────────────────────────────────────────────
app.use('/auth',      authRoutes);
app.use('/products',  productRoutes);
app.use('/sales',     salesRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/customers', customerRoutes);
app.use('/reports',   reportsRoutes);
app.use('/payments',  paystackRoutes);

app.get('/', (_req, res) => res.json({ message: 'QuickPOS API running ✅' }));

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
