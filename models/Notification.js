import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    link: { type: String, default: null },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }, // null = broadcast to eligible roles
    recipientRoles: [{ type: String }],
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    relatedEntity: {
      kind: { type: String, enum: ['Profile', 'Contact', 'Match', 'Admin', null], default: null },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
