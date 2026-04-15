// routes/authRoutes.js
import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);  // POST /auth/register
router.post('/login',    login);     // POST /auth/login

export default router;