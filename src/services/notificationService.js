const Notification = require('../models/Notification');
const NotificationPreferences = require('../models/NotificationPreferences');
const User = require('../models/User');
const pushNotificationService = require('./pushNotificationService');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Send notification to users when a live stream starts
   * @param {Object} competition - Competition object
   * @param {string} streamUrl - Live stream URL
   * @returns {Promise<Object>} Result of notification sending
   */
  async notifyLiveStreamStarted(competition, streamUrl) {
    try {
      const title = "Live Draw Started!";
      const message = `${competition.title}'s draw has started! Join now and win!`;
      const notificationType = 'live_updates';

      // Create in-app notification (broadcast to all users)
      const notification = new Notification({
        title,
        message,
        type: notificationType,
        user_id: null, // Broadcast notification
      });

      await notification.save();
      logger.info('In-app notification created for live stream', {
        competitionId: competition._id,
        notificationId: notification._id,
      });

      // Get all users who have live_updates enabled
      const users = await User.find({
        userStatus: 'Active',
        verified: true,
      }).select('_id device_tokens');

      // Filter users based on notification preferences
      const usersToNotify = [];
      const deviceTokensByPlatform = {
        android: [],
        ios: [],
      };

      for (const user of users) {
        try {
          const preferences = await NotificationPreferences.getPreferences(user._id);
          
          // Only send to users who have live_updates enabled
          if (preferences.live_updates) {
            usersToNotify.push(user._id);

            // Collect device tokens
            if (user.device_tokens && user.device_tokens.length > 0) {
              user.device_tokens.forEach((deviceToken) => {
                if (deviceToken.platform === 'android') {
                  deviceTokensByPlatform.android.push({
                    token: deviceToken.token,
                    userId: user._id,
                    deviceId: deviceToken.device_id,
                  });
                } else if (deviceToken.platform === 'ios') {
                  deviceTokensByPlatform.ios.push({
                    token: deviceToken.token,
                    userId: user._id,
                    deviceId: deviceToken.device_id,
                  });
                }
              });
            }
          }
        } catch (error) {
          logger.error('Error checking user preferences', {
            userId: user._id,
            error: error.message,
          });
        }
      }

      logger.info('Prepared users for notification', {
        totalUsers: users.length,
        usersToNotify: usersToNotify.length,
        androidTokens: deviceTokensByPlatform.android.length,
        iosTokens: deviceTokensByPlatform.ios.length,
      });

      // Send push notifications
      const pushResults = {
        android: { sent: 0, failed: 0, invalidTokens: [] },
        ios: { sent: 0, failed: 0, invalidTokens: [] },
      };

      // Prepare notification data payload
      const notificationData = {
        type: notificationType,
        competitionId: competition._id.toString(),
        streamUrl: streamUrl,
        notificationId: notification._id.toString(),
      };

      // Send Android notifications
      if (deviceTokensByPlatform.android.length > 0) {
        const androidTokens = deviceTokensByPlatform.android.map((item) => item.token);
        const result = await pushNotificationService.sendToMultipleDevices(
          androidTokens,
          title,
          message,
          notificationData,
          'android'
        );

        if (result.success) {
          pushResults.android.sent = result.sent || 0;
          pushResults.android.failed = result.failed || 0;
          pushResults.android.invalidTokens = result.invalidTokens || [];

          // Remove invalid tokens from database
          if (pushResults.android.invalidTokens.length > 0) {
            await this.removeInvalidTokens(pushResults.android.invalidTokens, 'android');
          }
        }
      }

      // Send iOS notifications
      if (deviceTokensByPlatform.ios.length > 0) {
        const iosTokens = deviceTokensByPlatform.ios.map((item) => item.token);
        const result = await pushNotificationService.sendToMultipleDevices(
          iosTokens,
          title,
          message,
          notificationData,
          'ios'
        );

        if (result.success) {
          pushResults.ios.sent = result.sent || 0;
          pushResults.ios.failed = result.failed || 0;
          pushResults.ios.invalidTokens = result.invalidTokens || [];

          // Remove invalid tokens from database
          if (pushResults.ios.invalidTokens.length > 0) {
            await this.removeInvalidTokens(pushResults.ios.invalidTokens, 'ios');
          }
        }
      }

      logger.info('Live stream notification sent', {
        competitionId: competition._id,
        inAppNotification: notification._id,
        pushNotifications: pushResults,
      });

      return {
        success: true,
        inAppNotification: notification._id,
        usersNotified: usersToNotify.length,
        pushNotifications: pushResults,
      };
    } catch (error) {
      logger.error('Failed to send live stream notifications', {
        error: error.message,
        stack: error.stack,
        competitionId: competition._id,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove invalid device tokens from database
   * @param {Array<string>} invalidTokens - Array of invalid token strings
   * @param {string} platform - 'ios' or 'android'
   */
  async removeInvalidTokens(invalidTokens, platform) {
    try {
      const result = await User.updateMany(
        {},
        {
          $pull: {
            device_tokens: {
              token: { $in: invalidTokens },
              platform: platform,
            },
          },
        }
      );

      logger.info('Removed invalid device tokens', {
        platform,
        count: invalidTokens.length,
        usersUpdated: result.modifiedCount,
      });
    } catch (error) {
      logger.error('Failed to remove invalid tokens', {
        error: error.message,
        platform,
      });
    }
  }

  /**
   * Send a general notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {string|null} userId - User ID (null for broadcast)
   * @param {Object} data - Additional data for push notifications
   * @returns {Promise<Object>} Result of notification sending
   */
  async sendNotification(title, message, type = 'system_update', userId = null, data = {}) {
    try {
      // Create in-app notification
      const notification = new Notification({
        title,
        message,
        type,
        user_id: userId,
      });

      await notification.save();

      // If user_id is specified, send push notification to that user
      if (userId) {
        const user = await User.findById(userId).select('device_tokens');
        if (user && user.device_tokens && user.device_tokens.length > 0) {
          const preferences = await NotificationPreferences.getPreferences(userId);
          
          // Check if user has this notification type enabled
          const typeEnabled = {
            competition_updates: preferences.competition_updates,
            winner_announcements: preferences.winner_announcements,
            new_competitions: preferences.new_competitions,
            live_updates: preferences.live_updates,
            system_update: preferences.system_update,
          };

          if (typeEnabled[type]) {
            const notificationData = {
              ...data,
              type,
              notificationId: notification._id.toString(),
            };

            // Send to all user's devices
            for (const deviceToken of user.device_tokens) {
              await pushNotificationService.sendToDevice(
                deviceToken.token,
                title,
                message,
                notificationData,
                deviceToken.platform
              );
            }
          }
        }
      }

      return {
        success: true,
        notification: notification._id,
      };
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error.message,
        userId,
        type,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;

