import mongoose from 'mongoose';
import { ACTIVITY_ACTIONS } from '../config/constants.js';

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    actorName: { type: String, required: true },
    action: { type: String, enum: Object.values(ACTIVITY_ACTIONS), required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    targetEntity: {
      kind: { type: String, default: null },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });

// Auto-expire logs after 2 years to keep the collection lean (adjust as needed)
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 });

export default mongoose.model('ActivityLog', activityLogSchema);
