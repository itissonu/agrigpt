const notificationService = require('../services/notificationService');
const User = require('../models/User');
const { body, query, param, validationResult } = require('express-validator');
const { logger } = require('../logger');
const Notification = require('../models/Notification');
const { default: mongoose } = require('mongoose');
const { Types } = require('mongoose');



const getNotifications = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Invalid page number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Invalid limit'),
  query('type').optional().isIn(['harvest_reminder', 'daily_update', 'weekly_report', 'test', 'system', 'weather', 'pest_alert']).withMessage('Invalid notification type'),
  query('category').optional().isIn(['crop_management', 'harvest', 'weather', 'system', 'marketing', 'finance']).withMessage('Invalid category'),
  query('isRead').optional().isBoolean().toBoolean().withMessage('Invalid isRead value'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for get notifications', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = { userId };
      if (req.query.type) filter.type = req.query.type;
      if (req.query.category) filter.category = req.query.category;
      if (req.query.isRead !== undefined) filter.isRead = req.query.isRead;
      if (req.query.priority) filter.priority = req.query.priority;

      // Get notifications with pagination
      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('data.cropId', 'name variety type')
        .lean();

      // Get total count for pagination
      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.getUnreadCount(userId);

      // Get counts by category for stats
      const categoryStats = await Notification.aggregate([
        { $match: { userId: Types.ObjectId(userId) } },
        { $group: { _id: '$category', count: { $sum: 1 }, unread: { $sum: { $cond: ['$isRead', 0, 1] } } } }
      ]);

      const stats = {
        total,
        unread: unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        categoryStats: categoryStats.reduce((acc, stat) => {
          acc[stat._id] = { total: stat.count, unread: stat.unread };
          return acc;
        }, {})
      };

      logger.info('Notifications retrieved', { userId, count: notifications.length, page, limit });
      res.json({ notifications, stats });
    } catch (error) {
      logger.error('Get notifications error', {
        error: error.message,
        stack: error.stack,
        userId: req.user.userId
      });
      res.status(500).json({ error: 'Failed to retrieve notifications' });
    }
  }
];

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await Notification.getUnreadCount(userId);

    res.json({ count });
  } catch (error) {
    logger.error('Get unread count error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.userId
    });
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Mark a notification as read
const markAsRead = [
  param('id').isMongoId().withMessage('Invalid notification ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for mark as read', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await Notification.findOne({ _id: id, userId });
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      if (!notification.isRead) {
        await notification.markAsRead();
        logger.info('Notification marked as read', { notificationId: id, userId });
      }

      res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
      logger.error('Mark as read error', {
        error: error.message,
        stack: error.stack,
        notificationId: req.params.id,
        userId: req.user.userId
      });
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }
];

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.markAllAsRead(userId);

    logger.info('All notifications marked as read', { userId, modifiedCount: result.modifiedCount });
    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error('Mark all as read error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.userId
    });
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// Delete a notification
const deleteNotification = [
  param('id').isMongoId().withMessage('Invalid notification ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for delete notification', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await Notification.findOneAndDelete({ _id: id, userId });
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      logger.info('Notification deleted', { notificationId: id, userId });
      res.json({ message: 'Notification deleted', notification });
    } catch (error) {
      logger.error('Delete notification error', {
        error: error.message,
        stack: error.stack,
        notificationId: req.params.id,
        userId: req.user.userId
      });
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
];

// Delete all read notifications
const deleteAllRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.deleteMany({ userId, isRead: true });

    logger.info('All read notifications deleted', { userId, deletedCount: result.deletedCount });
    res.json({
      message: 'All read notifications deleted',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Delete all read error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.userId
    });
    res.status(500).json({ error: 'Failed to delete read notifications' });
  }
};

// Create a manual notification (admin/system use)
const createNotification = [
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').optional().isIn(['harvest_reminder', 'daily_update', 'weekly_report', 'test', 'system', 'weather', 'pest_alert']).withMessage('Invalid type'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('category').optional().isIn(['crop_management', 'harvest', 'weather', 'system', 'marketing', 'finance']).withMessage('Invalid category'),
  body('actionUrl').optional().isString().withMessage('Invalid action URL'),
  body('scheduledFor').optional().isISO8601().toDate().withMessage('Invalid scheduled date'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for create notification', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const notificationData = {
        userId,
        ...req.body
      };

      const notification = new Notification(notificationData);
      await notification.save();

      logger.info('Manual notification created', { notificationId: notification._id, userId });
      res.status(201).json({ notification });
    } catch (error) {
      logger.error('Create notification error', {
        error: error.message,
        stack: error.stack,
        userId: req.user.userId
      });
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }
];


const updateFCMToken = [
  body('fcmToken').notEmpty().withMessage('FCM token is required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for update FCM token', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const { fcmToken } = req.body;
      const userId = req.user.userId;

      const user = await User.findByIdAndUpdate(
        userId,
        { fcmToken },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info('FCM token updated', { userId });
      res.json({ message: 'FCM token updated successfully' });
    } catch (error) {
      logger.error('Update FCM token error', {
        error: error.message,
        stack: error.stack,
        userId: req.user.userId
      });
      res.status(500).json({ error: 'Failed to update FCM token' });
    }
  }
];

// Update notification preferences
const updateNotificationPreferences = [
  body('harvestReminders').optional().isBoolean(),
  body('dailyUpdates').optional().isBoolean(),
  body('weeklyReports').optional().isBoolean(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for update notification preferences', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const preferences = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'notificationPreferences.harvestReminders': preferences.harvestReminders,
            'notificationPreferences.dailyUpdates': preferences.dailyUpdates,
            'notificationPreferences.weeklyReports': preferences.weeklyReports,
          }
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info('Notification preferences updated', { userId, preferences });
      res.json({
        message: 'Notification preferences updated successfully',
        preferences: user.notificationPreferences
      });
    } catch (error) {
      logger.error('Update notification preferences error', {
        error: error.message,
        stack: error.stack,
        userId: req.user.userId
      });
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  }
];

// Send immediate harvest reminder for a specific crop
const sendHarvestReminder = [
  param('cropId').isMongoId().withMessage('Invalid crop ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for send harvest reminder', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const { cropId } = req.params;
      const userId = req.user.userId;

      const results = await notificationService.sendHarvestReminder(cropId, userId);

      logger.info('Harvest reminder sent', { cropId, userId, results });
      res.json({
        message: 'Harvest reminder sent successfully',
        results
      });
    } catch (error) {
      logger.error('Send harvest reminder error', {
        error: error.message,
        stack: error.stack,
        cropId: req.params.cropId,
        userId: req.user.userId
      });
      res.status(500).json({ error: 'Failed to send harvest reminder' });
    }
  }
];

// Send test notification
const sendTestNotification = [
  body('type').optional().isIn(['web', 'mobile']).withMessage('Invalid notification type'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for send test notification', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const { type = 'web' } = req.body;
      const userId = req.user.userId;

      const result = await notificationService.sendTestNotification(userId, type);

      logger.info('Test notification sent', { userId, type, result });
      res.json({
        message: 'Test notification sent successfully',
        result
      });
    } catch (error) {
      logger.error('Send test notification error', {
        error: error.message,
        stack: error.stack,
        userId: req.user.userId
      });
      res.status(500).json({ error: error.message });
    }
  }
];

// Get notification preferences
const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('notificationPreferences');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ preferences: user.notificationPreferences });
  } catch (error) {
    logger.error('Get notification preferences error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.userId
    });
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  createNotification,
  updateFCMToken,
  updateNotificationPreferences,
  sendHarvestReminder,
  sendTestNotification,
  getNotificationPreferences
};