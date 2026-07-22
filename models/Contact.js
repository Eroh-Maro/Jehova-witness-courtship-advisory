import mongoose from 'mongoose';
import { CONTACT_STATUS } from '../config/constants.js';

const replySchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    repliedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: { type: String, trim: true },
    subject: { type: String, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: Object.values(CONTACT_STATUS), default: CONTACT_STATUS.NEW, index: true },
    replies: [replySchema],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true }
);

contactSchema.index({ createdAt: -1 });
contactSchema.index({ name: 'text', email: 'text', subject: 'text', message: 'text' });

export default mongoose.model('Contact', contactSchema);
