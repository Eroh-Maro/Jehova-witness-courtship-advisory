import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'platform_settings', unique: true },

    platformName: { type: String, default: 'Marriage Advisory Platform' },
    supportEmail: { type: String, default: 'support@example.org' },
    maintenanceMode: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: 'The platform is currently undergoing maintenance. Please check back soon.' },
    },

    notificationPreferences: {
      emailOnNewProfile: { type: Boolean, default: true },
      emailOnNewContact: { type: Boolean, default: true },
      emailOnNewMatch: { type: Boolean, default: true },
      dailyAdminSummary: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
    },

    matchRules: {
      minAge: { type: Number, default: 18 },
      maxAgeGapYears: { type: Number, default: 15 },
      requireSameCountryByDefault: { type: Boolean, default: false },
      autoArchiveAfterDaysInactive: { type: Number, default: 180 },
    },

    permissions: {
      coordinatorsCanApproveProfiles: { type: Boolean, default: false },
      coordinatorsCanDeleteProfiles: { type: Boolean, default: false },
      coordinatorsCanManageAdmins: { type: Boolean, default: false },
    },

    security: {
      sessionTimeoutMinutes: { type: Number, default: 60 },
      maxLoginAttempts: { type: Number, default: 5 },
      lockoutMinutes: { type: Number, default: 15 },
      passwordMinLength: { type: Number, default: 8 },
      require2FAForSuperAdmin: { type: Boolean, default: false },
    },

    backup: {
      autoBackupEnabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
      retentionDays: { type: Number, default: 30 },
    },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

export const getSettings = async () => {
  let settings = await mongoose.model('Setting').findOne({ singleton: 'platform_settings' });
  if (!settings) {
    settings = await mongoose.model('Setting').create({});
  }
  return settings;
};

export default mongoose.model('Setting', settingSchema);
