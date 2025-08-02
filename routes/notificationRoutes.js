const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateJWT } = require('../middleware/authMiddleware.js');

// Apply auth middleware to all notification routes
router.use(authenticateJWT);

// Get notifications with pagination and filtering
router.get('/', notificationController.getNotifications);

// Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark a specific notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', notificationController.markAllAsRead);

// Delete a specific notification
router.delete('/:id', notificationController.deleteNotification);

// Delete all read notifications
router.delete('/read/all', notificationController.deleteAllRead);

// Create a manual notification (for admin/system use)
router.post('/', notificationController.createNotification);

// Update FCM token for web push notifications
router.post('/fcm-token', notificationController.updateFCMToken);

// Update notification preferences
router.put('/preferences', notificationController.updateNotificationPreferences);

// Get notification preferences
router.get('/preferences', notificationController.getNotificationPreferences);

// Send immediate harvest reminder for a specific crop
router.post('/harvest-reminder/:cropId', notificationController.sendHarvestReminder);

// Send test notification
router.post('/test', notificationController.sendTestNotification);

module.exports = router;