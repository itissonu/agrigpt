const admin = require('firebase-admin');
const { logger } = require('../logger');

admin.initializeApp({
  credential: admin.credential.cert(require('../config/firebase-service-account.json')),
});

const sendPushNotification = async (deviceToken, title, body) => {
  try {
    if (!deviceToken) throw new Error('No device token provided');
    const message = {
      notification: {
        title,
        body,
      },
      token: deviceToken,
    };
    const response = await admin.messaging().send(message);
    logger.info('Push notification sent', { deviceToken, title, response });
    return response;
  } catch (error) {
    logger.error('Failed to send push notification', { error: error.message, stack: error.stack, deviceToken, title });
    throw error;
  }
};

module.exports = { sendPushNotification };