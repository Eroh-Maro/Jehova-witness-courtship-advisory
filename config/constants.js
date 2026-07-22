export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  COORDINATOR: 'coordinator',
};

export const ROLE_LIST = Object.values(ROLES);

export const PROFILE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
};

export const ASSIGNMENT_STATUS = {
  UNASSIGNED: 'unassigned',
  ASSIGNED: 'assigned',
  CLAIMED: 'claimed',
  COMPLETED: 'completed',
};

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
};

export const MARITAL_STATUS = {
  NEVER_MARRIED: 'never_married',
  WIDOWED: 'widowed',
  DIVORCED: 'divorced',
};

export const CONTACT_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  REPLIED: 'replied',
  CLOSED: 'closed',
};

export const MATCH_STATUS = {
  SUGGESTED: 'suggested',
  PENDING_APPROVAL: 'pending_approval',
  INTRODUCED: 'introduced',
  CONVERSATION: 'conversation',
  ENGAGED: 'engaged',
  MARRIED: 'married',
  ARCHIVED: 'archived',
};

export const MATCH_STATUS_ORDER = [
  MATCH_STATUS.SUGGESTED,
  MATCH_STATUS.PENDING_APPROVAL,
  MATCH_STATUS.INTRODUCED,
  MATCH_STATUS.CONVERSATION,
  MATCH_STATUS.ENGAGED,
  MATCH_STATUS.MARRIED,
  MATCH_STATUS.ARCHIVED,
];

export const NOTIFICATION_TYPES = {
  PROFILE_SUBMITTED: 'profile_submitted',
  PROFILE_APPROVED: 'profile_approved',
  PROFILE_SUSPENDED: 'profile_suspended',
  PROFILE_ASSIGNED: 'profile_assigned',
  PROFILE_CLAIMED: 'profile_claimed',

  CONTACT_RECEIVED: 'contact_received',
  CONTACT_REPLIED: 'contact_replied',

  MATCH_CREATED: 'match_created',
  MATCH_STATUS_CHANGED: 'match_status_changed',

  SYSTEM: 'system',
};
export const NOTIFICATION_AUDIENCE = {
  SUPER_ADMIN: 'super_admin_only',
  ADMIN_AND_ABOVE: 'admin_and_above',
  ALL: 'all',
};

export const ACTIVITY_ACTIONS = {
  ADMIN_LOGIN: 'admin_login',
  ADMIN_LOGOUT: 'admin_logout',
  ADMIN_INVITED: 'admin_invited',
  PASSWORD_RESET: 'password_reset',

  PROFILE_CREATED: 'profile_created',
  PROFILE_APPROVED: 'profile_approved',
  PROFILE_REJECTED: 'profile_rejected',
  PROFILE_EDITED: 'profile_edited',
  PROFILE_SUSPENDED: 'profile_suspended',
  PROFILE_REACTIVATED: 'profile_reactivated',
  PROFILE_DELETED: 'profile_deleted',

  PROFILE_ASSIGNED: 'profile_assigned',
  PROFILE_CLAIMED: 'profile_claimed',
  PROFILE_ASSIGNMENT_COMPLETED: 'profile_assignment_completed',

  CONTACT_REPLIED: 'contact_replied',
  CONTACT_STATUS_CHANGED: 'contact_status_changed',

  MATCH_CREATED: 'match_created',
  MATCH_UPDATED: 'match_updated',
  MATCH_STATUS_CHANGED: 'match_status_changed',

  SETTINGS_UPDATED: 'settings_updated',
  REPORT_GENERATED: 'report_generated',
};

export const EMAIL_TEMPLATES = {
  REGISTRATION_CONFIRMATION: 'registrationConfirmation',
  CONTACT_CONFIRMATION: 'contactConfirmation',
  CONTACT_REPLY: 'contactReply',
  ADMIN_NOTIFICATION: 'adminNotification',
  MATCH_NOTIFICATION: 'matchNotification',
  PASSWORD_RESET: 'passwordReset',
  ADMIN_INVITATION: 'adminInvitation',
  WELCOME: 'welcome',
  PROFILE_APPROVED: 'profileApproved',
  WEEKLY_DIGEST: 'weeklyDigest',
  DAILY_ADMIN_SUMMARY: 'dailyAdminSummary',
  PROFILE_SUSPENDED: 'profileSuspended',
  PROFILE_REACTIVATED: 'profileReactivated',
  PROFILE_DELETED: 'profileDeleted',
};

export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  NOTIFICATION: 'notification-queue',
  SCHEDULED: 'scheduled-queue',
};
