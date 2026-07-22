import mongoose from 'mongoose';
import { MATCH_STATUS } from '../config/constants.js';

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(MATCH_STATUS), required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    note: { type: String, trim: true, maxlength: 500 },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    profileA: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    profileB: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    status: { type: String, enum: Object.values(MATCH_STATUS), default: MATCH_STATUS.SUGGESTED, index: true },
    statusHistory: [statusHistorySchema],
    notes: [noteSchema],
    compatibilityScore: { type: Number, min: 0, max: 100, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    marriedAt: { type: Date, default: null },
    archivedReason: { type: String, trim: true },
  },
  { timestamps: true }
);

matchSchema.index({ profileA: 1, profileB: 1 }, { unique: true });
matchSchema.index({ status: 1, createdAt: -1 });

matchSchema.pre('validate', function normalizePair(next) {
  if (this.profileA && this.profileB && String(this.profileA) === String(this.profileB)) {
    return next(new Error('A profile cannot be matched with itself'));
  }
  // Keep pair ordering deterministic to make the unique index effective both ways
  if (this.profileA && this.profileB && String(this.profileA) > String(this.profileB)) {
    [this.profileA, this.profileB] = [this.profileB, this.profileA];
  }
  next();
});

export default mongoose.model('Match', matchSchema);
