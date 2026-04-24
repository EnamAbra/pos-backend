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


// CORS — allow the dev origins plus whatever FRONTEND_URL is set to on Render
const allowedOrigins = [

  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://pos-frontend-ten-pi.vercel.app',
];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

app.use(cors({
  origin: 'https://pos-frontend-ten-pi.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON and simultaneously stash the raw bytes on req.rawBody.
// The Paystack webhook HMAC verification needs the exact raw string
// that Paystack signed — this is the only reliable way to get it when
// express.json() is applied globally.
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));

app.use('/auth',      authRoutes);
app.use('/products',  productRoutes);
app.use('/sales',     salesRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/customers', customerRoutes);
app.use('/reports',   reportsRoutes);
app.use('/payments',  paystackRoutes);

app.get('/', (_req, res) => res.json({ message: 'QuickPOS API running ✅' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Parse JSON and simultaneously stash the raw bytes on req.rawBody.
// The Paystack webhook HMAC verification needs the exact raw string
// that Paystack signed — this is the only reliable way to get it when
// express.json() is applied globally.
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));

app.use('/auth',      authRoutes);
app.use('/products',  productRoutes);
app.use('/sales',     salesRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/customers', customerRoutes);
app.use('/reports',   reportsRoutes);
app.use('/payments',  paystackRoutes);

app.get('/', (_req, res) => res.json({ message: 'QuickPOS API running ✅' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
