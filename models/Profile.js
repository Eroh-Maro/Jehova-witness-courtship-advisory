import mongoose from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import {
  PROFILE_STATUS,
  ASSIGNMENT_STATUS,
  GENDER,
  MARITAL_STATUS,
} from '../config/constants.js';
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(PROFILE_STATUS), required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    note: { type: String, trim: true, maxlength: 500 },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    memberId: { type: String, required: true, unique: true, index: true }, // e.g. JW-000001

    // Identity
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: Object.values(GENDER), required: true },
    maritalStatus: { type: String, enum: Object.values(MARITAL_STATUS), required: true },

    // Location & congregation
    // Stored as a 2-letter ISO 3166-1 alpha-2 code (e.g. "US", "NG") to match the
    // <select> values on the frontend and keep the exact-match filter in
    // searchProfiles cheap and reliable. Translate to a display label in the UI layer.
    country: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 2,
    },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    congregation: { type: String, required: true, trim: true },
    baptismYear: { type: Number, min: 1900, max: new Date().getFullYear() },
    circuitOverseerContact: { type: String, trim: true },

    // Spiritual / lifestyle
    pioneerStatus: { type: String, enum: ['none', 'auxiliary', 'regular', 'special'], default: 'none' },
    hoursPerMonth: { type: Number, min: 0 },
    meetingAttendance: { type: String, trim: true },
    spiritualGoals: { type: String, trim: true, maxlength: 3000 },
    qualities: [{ type: String, trim: true, maxlength: 40 }],

    // About
    occupation: { type: String, trim: true },
    education: { type: String, trim: true },
    aboutMe: { type: String, trim: true, maxlength: 3000 },
    lookingFor: { type: String, trim: true, maxlength: 3000 },

    // Preferences / logistics
    relocation: { type: String, enum: ['open', 'same_country', 'local_only'], default: 'local_only' },
    hasChildren: { type: String, enum: ['none', 'not_in_home', 'in_home'], default: 'none' },

    // Contact
    preferredContact: { type: String, enum: ['email', 'phone', 'either'], default: 'either' },
    bestTimeToContact: { type: String, trim: true, maxlength: 120 },

    // Media
    profileImageUrl: { type: String, default: null },
    profileImagePublicId: { type: String, default: null },
    gallery: [
      {
        url: String,
        publicId: String,
      },
    ],

    // Workflow
    status: { type: String, enum: Object.values(PROFILE_STATUS), default: PROFILE_STATUS.PENDING, index: true },
    statusHistory: [statusHistorySchema],
    rejectionReason: { type: String, trim: true },
    suspendedReason: { type: String, trim: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    approvedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    
    // Assignment / Ownership
assignedAdmin: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Admin',
  default: null,
  index: true,
},

assignedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Admin',
  default: null,
},

assignedAt: {
  type: Date,
  default: null,
},

claimedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Admin',
  default: null,
  index: true,
},

claimedAt: {
  type: Date,
  default: null,
},

assignmentStatus: {
  type: String,
  enum: Object.values(ASSIGNMENT_STATUS),
  default: ASSIGNMENT_STATUS.UNASSIGNED,
  index: true,
},

    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// country dropped from the text index now that it's a 2-letter code rather than
// searchable text — filter on it via the dedicated exact-match `country` param instead.
profileSchema.index({ firstName: 'text', lastName: 'text', congregation: 'text', email: 'text' });
profileSchema.index({ gender: 1, status: 1, country: 1 });
profileSchema.index({ createdAt: -1 });
profileSchema.index({ assignedAdmin: 1, assignmentStatus: 1 });
profileSchema.index({ claimedBy: 1, assignmentStatus: 1 });
profileSchema.index({ country: 1, assignmentStatus: 1 });

profileSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

profileSchema.virtual('age').get(function age() {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - new Date(this.dateOfBirth).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

profileSchema.set('toJSON', { virtuals: true });
profileSchema.set('toObject', { virtuals: true });

// Lets virtuals (like `age` and `fullName`) survive .lean() queries — without this plugin,
// any query using .lean() (e.g. list/search endpoints) would silently drop these computed
// fields even though they show up fine on regular (non-lean) document fetches.
profileSchema.plugin(mongooseLeanVirtuals);

profileSchema.pre(/^find/, function excludeDeleted(next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ isDeleted: { $ne: true } });
  next();
});

export default mongoose.model('Profile', profileSchema);