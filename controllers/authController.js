const authService = require('../services/authService.js');
const { body, validationResult } = require('express-validator');
const { logger } = require('../logger.js');

const register = [
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('deviceToken').optional().isString().withMessage('Invalid device token'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for register', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, phone, password, deviceToken } = req.body;
      logger.debug('Registering user', { email, phone });

      const user = await authService.registerUser({ email, phone, password, deviceToken });
      res.status(201).json({ user: { id: user._id, email: user.email, phone: user.phone, deviceToken: user.deviceToken } });
    } catch (error) {
      logger.error('Register error', { error: error.message, stack: error.stack, body: req.body });
      res.status(400).json({ error: error.message });
    }
  },
];

const login = [
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for login', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, phone, password  } = req.body;
      logger.debug('Logging in user', { email, phone });

      const { token, user } = await authService.loginUser({ email, phone, password  });
      res.json({ token, user });
    } catch (error) {
      logger.error('Login error', { error: error.message, stack: error.stack, body: req.body });
      res.status(401).json({ error: error.message });
    }
  },
];

const logout = [
  async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) throw new Error('No token provided');
      await authService.logoutUser(token);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error', { error: error.message, stack: error.stack });
      res.status(400).json({ error: error.message });
    }
  },
];

module.exports = { register, login, logout };