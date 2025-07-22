const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { logger } = require('../logger');

// const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
// redisClient.connect().then(() => logger.info('Redis connected for auth', { component: 'redis' }));

const registerUser = async ({ email, phone, password, deviceToken }) => {
  try {
    if (!email || !phone) throw new Error('Email or phone is required');
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) throw new Error('Email or phone already exists');

    const user = await User.create({ email, phone, password, deviceToken });
    logger.info('User registered', { userId: user._id, email, phone });
    return user;
  } catch (error) {
    logger.error('User registration failed', { error: error.message, stack: error.stack, email, phone });
    throw error;
  }
};

const loginUser = async ({ email, phone, password  }) => {
  try {
    if (!email && !phone) throw new Error('Email or phone is required');
    const user = await User.findOne({ $or: [{ email }, { phone }] });
    if (!user) throw new Error('User not found');
    if (!(await user.comparePassword(password))) throw new Error('Invalid password');

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const sessionData = { userId: user._id, email: user.email, phone: user.phone, deviceToken: user.deviceToken };
   
    logger.info('User logged in', { userId: user._id, email, phone });

    return { token, user: { id: user._id, email: user.email, phone: user.phone, deviceToken: user.deviceToken } };
  } catch (error) {
    logger.error('User login failed', { error: error.message, stack: error.stack, email, phone });
    throw error;
  }
};

const logoutUser = async (token) => {
  try {
    //await redisClient.del(`session:${token}`);
    logger.info('User logged out', { token });
  } catch (error) {
    logger.error('User logout failed', { error: error.message, stack: error.stack, token });
    throw error;
  }
};


const getSessionData = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // You can customize and return only what you need
    return {
      userId: decoded.userId,
      // optionally include more fields if needed
    };
  } catch (error) {
    logger.error('Failed to decode token', { error: error.message, token });
    throw new Error('Invalid or expired token');
  }
};
// const getSessionData = async (token) => {
//   try {
//   //  const sessionData = await redisClient.get(`session:${token}`);
//     //if (!sessionData) throw new Error('Invalid or expired session');
//     return JSON.parse(sessionData);
//   } catch (error) {
//     logger.error('Failed to get session data', { error: error.message, stack: error.stack, token });
//     throw error;
//   }
// };

module.exports = { registerUser, loginUser, logoutUser ,getSessionData};