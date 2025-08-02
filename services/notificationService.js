const admin = require('firebase-admin');
const { logger } = require('../logger');
const Crop = require('../models/Crop');
const Notification = require('../models/Notification');
const cron = require('node-cron');

// Initialize Firebase Admin (if not already done)
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

class NotificationService {
  constructor() {
    // Schedule daily check for crops due for harvest
    this.scheduleDailyHarvestCheck();
  }

  // Create notification in database
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
      return { success: true, messageId: response, sentAt: new Date() };
    } catch (error) {
      logger.error('Failed to send push notification', {
        error: error.message,
        stack: error.stack,
        deviceToken,
        title
      });
      return { success: false, error: error.message, sentAt: new Date() };
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

        },
        data: {
          type: data.type || 'system',
          url: data.actionUrl || '/notifications',
          ...data
        },
        token: fcmToken,
        webpush: {
          headers: {
            'TTL': '300',
          },
          notification: {
            title,
            body,
            icon: '/aggpt.png',               // ✅ valid here
            badge: '/badge-72x72.png',
            tag: data.type || 'notification',
            requireInteraction: data.priority === 'high' || data.priority === 'urgent',
            actions: [
              {
                action: 'view',
                title: 'View',
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
            link: data.actionUrl || '/notifications'
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info('Web push notification sent', { fcmToken, title, response });
      return { success: true, messageId: response, sentAt: new Date() };
    } catch (error) {
      logger.error('Failed to send web push notification', {
        error: error.message,
        stack: error.stack,
        fcmToken,
        title
      });
      return { success: false, error: error.message, sentAt: new Date() };
    }
  }

  // Send notification with database storage
  async sendNotificationWithStorage(userId, notificationData, pushData = {}) {
    try {
      // Create notification in database first
      const dbNotification = await this.createNotificationInDB(userId, notificationData);


      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const deliveryResults = {
        web: { sent: false },
        mobile: { sent: false }
      };

      const sendResults = [];

      const tokensToTry = new Set(); // Avoid sending duplicate requests
      if (user.fcmToken) tokensToTry.add(user.fcmToken);
      if (user.deviceToken) tokensToTry.add(user.deviceToken);

      for (const token of tokensToTry) {
        // Web push
        sendResults.push(
          this.sendWebPushNotification(
            token,
            notificationData.title,
            notificationData.message,
            {
              ...pushData,
              notificationId: dbNotification._id.toString(),
              type: notificationData.type,
              priority: notificationData.priority,
              actionUrl: notificationData.actionUrl
            }
          ).then(res => {
            if (!deliveryResults.web.sent) deliveryResults.web = res;
          }).catch(err => {
            logger.warn('Web push failed', { token, err: err.message });
          })
        );

        // Mobile push
        sendResults.push(
          this.sendPushNotification(
            token,
            notificationData.title,
            notificationData.message,
            {
              ...pushData,
              notificationId: dbNotification._id.toString(),
              type: notificationData.type,
              priority: notificationData.priority
            }
          ).then(res => {
            if (!deliveryResults.mobile.sent) deliveryResults.mobile = res;
          }).catch(err => {
            logger.warn('Mobile push failed', { token, err: err.message });
          })
        );
      }

      // Wait for all attempts
      await Promise.allSettled(sendResults);

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

  // Check for crops due for harvest and send notifications
  async checkAndNotifyHarvestDue() {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Find crops due for harvest today or tomorrow
      const cropsDue = await Crop.find({
        whenToPluck: {
          $gte: today.toISOString().split('T')[0],
          $lte: tomorrow.toISOString().split('T')[0]
        },
        currentStage: { $nin: ['Harvested'] }
      }).populate('userId', 'deviceToken fcmToken email notificationPreferences');

      logger.info(`Found ${cropsDue.length} crops due for harvest`);

      for (const crop of cropsDue) {
        // Check if user has harvest reminders enabled
        if (!crop.userId.notificationPreferences?.harvestReminders) {
          continue;
        }

        const pluckDate = new Date(crop.whenToPluck);
        const isToday = pluckDate.toDateString() === today.toDateString();
        const isTomorrow = pluckDate.toDateString() === tomorrow.toDateString();

        const title = isToday ?
          `🌾 Harvest Today: ${crop.name}` :
          `⏰ Harvest Tomorrow: ${crop.name}`;

        const message = `Your ${crop.name} (${crop.variety}) is ready to harvest in ${crop.location}!`;

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
      const message = `Your ${crop.name} (${crop.variety}) in ${crop.location} is ready for harvest!`;

      const notificationData = {
        title,
        message,
        type: 'harvest_reminder',
        priority: 'high',
        category: 'harvest',
        actionUrl: `/crop`,
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

      const result = await this.sendNotificationWithStorage(userId, notificationData, pushData);
      return result;
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

  // Send daily update notification
  async sendDailyUpdate(userId, updateData) {
    try {
      const title = '📊 Daily Farm Update';
      const message = `Today's summary: ${updateData.activeCrops} active crops, ${updateData.tasksCompleted} tasks completed`;

      const notificationData = {
        title,
        message,
        type: 'daily_update',
        priority: 'low',
        category: 'system',
        actionUrl: '/dashboard',
        icon: '📊',
        data: {
          metadata: updateData
        }
      };

      const result = await this.sendNotificationWithStorage(userId, notificationData);
      return result;
    } catch (error) {
      logger.error('Failed to send daily update', { error: error.message, userId });
      throw error;
    }
  }

  // Send weather alert
  async sendWeatherAlert(userId, weatherData) {
    try {
      const title = `🌦️ Weather Alert: ${weatherData.condition}`;
      const message = `${weatherData.description} Expected temperature: ${weatherData.temperature}°C`;

      const notificationData = {
        title,
        message,
        type: 'weather',
        priority: weatherData.severity || 'medium',
        category: 'weather',
        actionUrl: '/weather',
        icon: '🌦️',
        data: {
          metadata: weatherData
        }
      };

      const result = await this.sendNotificationWithStorage(userId, notificationData);
      return result;
    } catch (error) {
      logger.error('Failed to send weather alert', { error: error.message, userId });
      throw error;
    }
  }

  // Send pest alert
  async sendPestAlert(userId, pestData) {
    try {
      const title = `🐛 Pest Alert: ${pestData.pestType}`;
      const message = `${pestData.description} Crop: ${pestData.cropName}`;

      const notificationData = {
        title,
        message,
        type: 'pest_alert',
        priority: 'high',
        category: 'crop_management',
        actionUrl: `/crops`,
        icon: '🐛',
        data: {
          cropId: pestData.cropId,
          metadata: pestData
        }
      };

      const result = await this.sendNotificationWithStorage(userId, notificationData);
      return result;
    } catch (error) {
      logger.error('Failed to send pest alert', { error: error.message, userId });
      throw error;
    }
  }

  // Clean up old notifications (called via cron or manually)
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        isRead: true
      });

      logger.info('Old notifications cleaned up', { deletedCount: result.deletedCount });
      return result;
    } catch (error) {
      logger.error('Failed to cleanup old notifications', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;