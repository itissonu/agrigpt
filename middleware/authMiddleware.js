const jwt = require('jsonwebtoken');
const { logger } = require('../logger.js');
const authService = require('../services/authService.js');

const authenticateJWT = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      logger.warn('No token provided', { ip: req.ip });
      return res.status(401).json({ error: 'No token provided' });
    }
  console.log(" token"+token);


    const decoded = jwt.verify(token, process.env.JWT_SECRET);
   // const sessionData = await authService.getSessionData(token);
    req.user = { userId: decoded.userId };
    logger.debug('Token validated', { userId: decoded.userId });
    next();
  } catch (error) {
    logger.error('Token validation failed', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticateJWT };