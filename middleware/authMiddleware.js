// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

/**
 * Protects routes — checks for a valid JWT in the Authorization header.
 * Attach to any route you want to lock down.
 *
 * Header format:  Authorization: Bearer <token>
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = decoded; // { user_id, username, role }
    next();
  });
};

/**
 * Restrict a route to specific roles.
 * Usage: router.delete('/:id', authMiddleware, requireRole('admin'), deleteProduct)
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
};