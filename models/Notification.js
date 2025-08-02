const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['harvest_reminder', 'daily_update', 'weekly_report', 'test', 'system', 'weather', 'pest_alert'], 
    default: 'system' 
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  readAt: { 
    type: Date, 
    default: null 
  },
  data: {
    cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop' },
    cropName: String,
    variety: String,
    location: String,
    harvestDate: String,
    // Additional metadata can be stored here
    metadata: mongoose.Schema.Types.Mixed
  },
  deliveryStatus: {
    web: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      messageId: String,
      error: String
    },
    mobile: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      messageId: String,
      error: String
    }
  },
  scheduledFor: { 
    type: Date, 
    default: null // For scheduled notifications
  },
  expiresAt: { 
    type: Date, 
    default: null // For notifications that should expire
  },
  actionUrl: { 
    type: String, 
    default: null // URL to navigate when notification is clicked
  },
  icon: { 
    type: String, 
    default: null // Icon for the notification
  },
  category: {
    type: String,
    enum: ['crop_management', 'harvest', 'weather', 'system', 'marketing', 'finance'],
    default: 'system'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Update the updatedAt field before saving
notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Mark notification as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    { 
      $set: { 
        isRead: true, 
        readAt: new Date(),
        updatedAt: new Date()
      } 
    }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);