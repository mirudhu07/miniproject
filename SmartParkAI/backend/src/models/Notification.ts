export interface INotification {
  id?: string;
  _id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'reservation' | 'session' | 'alert' | 'system';
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

let _NotificationModel: any = null;

export async function getNotificationModel() {
  if (!_NotificationModel) {
    const mongoose = (await import('mongoose')).default;
    const NotificationSchema = new mongoose.Schema(
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: { type: String, enum: ['reservation', 'session', 'alert', 'system'], default: 'system' },
        isRead: { type: Boolean, default: false },
        metadata: { type: mongoose.Schema.Types.Mixed },
      },
      { timestamps: true }
    );
    _NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
  }
  return _NotificationModel;
}
