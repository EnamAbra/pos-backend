// controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import queryAsync from '../queryAsync.js';



// POST /auth/register
export const register = async (req, res) => {
    
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const validRoles = ['admin', 'manager', 'cashier'];
  const userRole = validRoles.includes(role) ? role : 'cashier';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await queryAsync(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, userRole]
    );
    res.status(201).json({ success: true, message: 'User registered', user_id: result.insertId });
  } catch (err) {
  console.error('Registration error:', err);  
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Username already exists' });
  }
  res.status(500).json({ message: 'Registration failed', error: err.message });
}
};

// POST /auth/login  →  returns JWT token
export const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const rows = await queryAsync('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }


    // Sign token — expires after one 8-hour shift
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,                          // ← copy this for Postman
      user: { user_id: user.user_id, username: user.username, role: user.role }
    });
  } catch (err) {
     console.error('Registration error:', err)
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};