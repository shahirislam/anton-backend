const admin = require('firebase-admin');
const logger = require('../utils/logger');

class PushNotificationService {
  constructor() {
    this.initialized = false;
    this.fcmEnabled = false;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    try {
      // Check if Firebase credentials are provided
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const firebaseConfig = process.env.FIREBASE_CONFIG;

      if (serviceAccountPath) {
        // Initialize with service account file
        try {
          const fs = require('fs');
          const path = require('path');
          const serviceAccountPathResolved = path.resolve(serviceAccountPath);
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPathResolved, 'utf8'));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          this.fcmEnabled = true;
          logger.info('Firebase Admin SDK initialized with service account file');
        } catch (fileError) {
          logger.error('Failed to load Firebase service account file', {
            path: serviceAccountPath,
            error: fileError.message,
          });
          this.fcmEnabled = false;
        }
      } else if (firebaseConfig) {
        // Initialize with JSON config from environment variable
        const config = JSON.parse(firebaseConfig);
        admin.initializeApp({
          credential: admin.credential.cert(config),
        });
        this.fcmEnabled = true;
        logger.info('Firebase Admin SDK initialized with config from environment');
      } else {
        logger.warn('Firebase credentials not found. Push notifications will be disabled.');
        logger.warn('Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_CONFIG environment variable to enable push notifications.');
        this.fcmEnabled = false;
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK', {
        error: error.message,
        stack: error.stack,
      });
      this.fcmEnabled = false;
      this.initialized = true; // Mark as initialized even if failed to prevent retries
    }
  }

  /**
   * Send push notification to a single device
   * @param {string} deviceToken - FCM device token
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data payload
   * @param {string} platform - 'ios' or 'android'
   * @returns {Promise<Object>} Result of the notification send
   */
  async sendToDevice(deviceToken, title, body, data = {}, platform = 'android') {
    if (!this.fcmEnabled) {
      logger.warn('Push notifications disabled. Skipping notification send.');
      return { success: false, error: 'Push notifications not configured' };
    }

    try {
      const message = {
        token: deviceToken,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          title,
          body,
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      logger.info('Push notification sent successfully', {
        deviceToken: deviceToken.substring(0, 20) + '...',
        platform,
        messageId: response,
      });

      return { success: true, messageId: response };
    } catch (error) {
      logger.error('Failed to send push notification', {
        error: error.message,
        deviceToken: deviceToken.substring(0, 20) + '...',
        platform,
      });

      // Handle invalid token errors
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        return { success: false, error: 'invalid_token', shouldRemove: true };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple devices
   * @param {Array<string>} deviceTokens - Array of FCM device tokens
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data payload
   * @param {string} platform - 'ios' or 'android'
   * @returns {Promise<Object>} Result of the batch notification send
   */
  async sendToMultipleDevices(deviceTokens, title, body, data = {}, platform = 'android') {
    if (!this.fcmEnabled) {
      logger.warn('Push notifications disabled. Skipping batch notification send.');
      return { success: false, error: 'Push notifications not configured' };
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          title,
          body,
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        tokens: deviceTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      logger.info('Batch push notification sent', {
        total: deviceTokens.length,
        success: response.successCount,
        failed: response.failureCount,
        platform,
      });

      // Extract invalid tokens that should be removed
      const invalidTokens = [];
      if (response.responses) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (errorCode === 'messaging/invalid-registration-token' || 
                errorCode === 'messaging/registration-token-not-registered') {
              invalidTokens.push(deviceTokens[idx]);
            }
          }
        });
      }

      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      logger.error('Failed to send batch push notifications', {
        error: error.message,
        tokenCount: deviceTokens.length,
        platform,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Check if push notifications are enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.fcmEnabled;
  }
}

// Export singleton instance
const pushNotificationService = new PushNotificationService();

module.exports = pushNotificationService;

