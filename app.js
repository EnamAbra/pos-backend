import 'dotenv/config';
import express from 'express';
import cors from 'cors';


import authRoutes    from './routes/authRoutes.js';
import productRoutes   from './routes/productRoutes.js';
import salesRoutes     from './routes/salesRoutes.js';
import inventoryRoutes from './routes/Inventoryroutes.js';
import customerRoutes  from './routes/CustomerRoutes.js';
import reportsRoutes   from './routes/reportsRoutes.js';
import paystackRoutes  from './routes/PaystackRoutes.js';

const app = express();

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// IMPORTANT: Paystack webhook route BEFORE express.json()
// The webhook captures raw body itself for HMAC-SHA512 verification.


app.use(express.json());
app.use('/payments', paystackRoutes);
app.use('/auth',      authRoutes);
app.use('/products',  productRoutes);
app.use('/sales',     salesRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/customers', customerRoutes);
app.use('/reports',   reportsRoutes);

app.get('/', (req, res) => res.json({ message: 'QuickPOS API running ✅' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));