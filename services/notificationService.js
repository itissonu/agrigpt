const admin = require('firebase-admin');
const { logger } = require('../logger');
const Crop = require('../models/Crop');
const cron = require('node-cron');
const Notification = require('../models/Notification');

// Initialize Firebase Admin (if not already done)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../config/firebase-service-account.json')),
  });
}

class NotificationService {
  constructor() {
    // Schedule daily check for crops due for harvest
    this.scheduleDailyHarvestCheck();
  }
  async createNotificationInDB(userId, notificationData) {
    try {
      const notification = new Notification({
        userId,
        ...notificationData
      });

      await notification.save();
      logger.info('Notification saved to database', {
        notificationId: notification._id,
        userId,
        type: notificationData.type
      });

      return notification;
    } catch (error) {
      logger.error('Failed to save notification to database', {
        error: error.message,
        userId,
        notificationData
      });
      throw error;
    }
  }
  // Send push notification to mobile devices
  async sendPushNotification(deviceToken, title, body, data = {}) {
    try {
      if (!deviceToken) throw new Error('No device token provided');

      const message = {
        notification: {
          title,
          body,
        },
        data: {
          type: 'harvest_reminder',
          ...data
        },
        token: deviceToken,
      };

      const response = await admin.messaging().send(message);
      logger.info('Push notification sent', { deviceToken, title, response });
      return response;
    } catch (error) {
      logger.error('Failed to send push notification', {
        error: error.message,
        stack: error.stack,
        deviceToken,
        title
      });
      throw error;
    }
  }

  // Send web push notification using Firebase Cloud Messaging
  async sendWebPushNotification(fcmToken, title, body, data = {}) {
    try {
      if (!fcmToken) throw new Error('No FCM token provided');

      const message = {
        notification: {
          title,
          body,
          icon: '/aggpt.png', // Add your app icon path
          badge: '/badge-72x72.png',  // Add your badge icon path
          click_action: '/notifications', // URL to navigate when notification is clicked
        },
        data: {
          type: data.type || 'system',
          url: '/notifications',
          ...data
        },
        token: fcmToken,
        webpush: {
          headers: {
            'TTL': '300', // Time to live in seconds
          },
          notification: {
            title,
            body,
            icon: '/aggpt.png',
            badge: '/badge-72x72.png',
            tag: 'harvest-reminder', // Prevents duplicate notifications
            requireInteraction: data.priority === 'high' || data.priority === 'urgent', // Keeps notification visible until user interacts
            actions: [
              {
                action: 'view',
                title: 'View Crop',
                icon: '/view-icon.png'
              },
              {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/dismiss-icon.png'
              }
            ]
          },
          fcm_options: {
            link: '/crops'
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info('Web push notification sent', { fcmToken, title, response });
      return response;
    } catch (error) {
      logger.error('Failed to send web push notification', {
        error: error.message,
        stack: error.stack,
        fcmToken,
        title
      });
      throw error;
    }
  }

  // Schedule daily check for crops due for harvest (runs at 9 AM daily)
  scheduleDailyHarvestCheck() {
    cron.schedule('0 9 * * *', async () => {
      try {
        await this.checkAndNotifyHarvestDue();
      } catch (error) {
        logger.error('Failed to run daily harvest check', { error: error.message });
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    logger.info('Daily harvest check scheduled at 9:00 AM');
  }

  async sendNotificationWithStorage(userId, notificationData, pushData = {}) {
    try {
      // Create notification in database first
      const dbNotification = await this.createNotificationInDB(userId, notificationData);

      // Get user tokens
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const deliveryResults = {
        web: { sent: false },
        mobile: { sent: false }
      };

      // Send web push notification if FCM token exists
      if (user.fcmToken) {
        const webResult = await this.sendWebPushNotification(
          user.fcmToken,
          notificationData.title,
          notificationData.message,
          {
            ...pushData,
            notificationId: dbNotification._id.toString(),
            type: notificationData.type,
            priority: notificationData.priority,
            actionUrl: notificationData.actionUrl
          }
        );
        deliveryResults.web = webResult;
      }

      // Send mobile push notification if device token exists
      if (user.deviceToken) {
        const mobileResult = await this.sendPushNotification(
          user.deviceToken,
          notificationData.title,
          notificationData.message,
          {
            ...pushData,
            notificationId: dbNotification._id.toString(),
            type: notificationData.type,
            priority: notificationData.priority
          }
        );
        deliveryResults.mobile = mobileResult;
      }

      // Update notification with delivery status
      await Notification.findByIdAndUpdate(dbNotification._id, {
        deliveryStatus: deliveryResults
      });

      return {
        notification: dbNotification,
        deliveryResults
      };
    } catch (error) {
      logger.error('Failed to send notification with storage', {
        error: error.message,
        userId,
        notificationData
      });
      throw error;
    }
  }
  // Check for crops due for harvest and send notifications
  async checkAndNotifyHarvestDue() {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Find crops due for harvest today or tomorrow
      const cropsDue = await Crop.find({
        whenToPluck: {
          $gte: today.toISOString().split('T')[0], // Today
          $lte: tomorrow.toISOString().split('T')[0] // Tomorrow
        },
        currentStage: { $nin: ['Harvested'] } // Exclude already harvested crops
      }).populate('userId', 'deviceToken fcmToken email');

      logger.info(`Found ${cropsDue.length} crops due for harvest`);

      for (const crop of cropsDue) {
        const pluckDate = new Date(crop.whenToPluck);
        const isToday = pluckDate.toDateString() === today.toDateString();
        const isTomorrow = pluckDate.toDateString() === tomorrow.toDateString();

        const title = isToday ?
          `🌾 Harvest Today: ${crop.name}` :
          `⏰ Harvest Tomorrow: ${crop.name}`;

        const body = `Your ${crop.name} (${crop.variety}) is ready to harvest in ${crop.location}!`;

        const notificationData = {
          title,
          message,
          type: 'harvest_reminder',
          priority: isToday ? 'high' : 'medium',
          category: 'harvest',
          actionUrl: `/crops`,
          icon: '🌾',
          data: {
            cropId: crop._id,
            cropName: crop.name,
            variety: crop.variety,
            location: crop.location,
            harvestDate: crop.whenToPluck
          }
        };
        const pushData = {
          cropId: crop._id.toString(),
          cropName: crop.name,
          variety: crop.variety,
          location: crop.location,
          harvestDate: crop.whenToPluck
        };
        // Send mobile push notification if device token exists
        try {
          await this.sendNotificationWithStorage(crop.userId._id, notificationData, pushData);
        } catch (error) {
          logger.error('Failed to send harvest notification', {
            cropId: crop._id,
            userId: crop.userId._id,
            error: error.message
          });
        }
      }
    } catch (error) {
      logger.error('Failed to check and notify harvest due', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  // Send immediate notification for a specific crop
  async sendHarvestReminder(cropId, userId) {
    try {
      const crop = await Crop.findOne({ _id: cropId, userId })
        .populate('userId', 'deviceToken fcmToken');

      if (!crop) {
        throw new Error('Crop not found');
      }

      const title = `🌾 Harvest Reminder: ${crop.name}`;
      const body = `Your ${crop.name} (${crop.variety}) in ${crop.location} is ready for harvest!`;

      const notificationData = {
        cropId: crop._id.toString(),
        cropName: crop.name,
        variety: crop.variety,
        location: crop.location,
        harvestDate: crop.whenToPluck
      };

      const results = [];

      // Send to mobile if token exists
      if (crop.userId.deviceToken) {
        const mobileResult = await this.sendPushNotification(
          crop.userId.deviceToken,
          title,
          body,
          notificationData
        );
        results.push({ type: 'mobile', success: true, result: mobileResult });
      }

      // Send to web if FCM token exists
      if (crop.userId.fcmToken) {
        const webResult = await this.sendWebPushNotification(
          crop.userId.fcmToken,
          title,
          body,
          notificationData
        );
        results.push({ type: 'web', success: true, result: webResult });
      }

      return results;
    } catch (error) {
      logger.error('Failed to send harvest reminder', {
        error: error.message,
        cropId,
        userId
      });
      throw error;
    }
  }

  // Test notification function
  async sendTestNotification(userId, type = 'web') {
    try {
      const title = '🧪 Test Notification';
      const message = 'This is a test notification from your farm management system!';
      
      const notificationData = {
        title,
        message,
        type: 'test',
        priority: 'medium',
        category: 'system',
        actionUrl: '/notifications',
        icon: '🧪'
      };

      const result = await this.sendNotificationWithStorage(userId, notificationData);
      return result;
    } catch (error) {
      logger.error('Failed to send test notification', { error: error.message, userId, type });
      throw error;
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;