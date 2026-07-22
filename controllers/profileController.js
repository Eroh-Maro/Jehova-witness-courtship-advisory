import Profile from '../models/Profile.js';
import Admin from '../models/Admin.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, buildMeta, buildSort } from '../utils/pagination.js';
import { generateMemberId, calculateAge } from '../services/profileService.js';
import { uploadImage, deleteImage } from '../services/cloudinaryService.js';
import { logActivity } from '../services/activityLogService.js';
import { notify } from '../services/notificationService.js';
import { queueEmail } from '../queues/emailQueue.js';
import {
  ACTIVITY_ACTIONS,
  EMAIL_TEMPLATES,
  NOTIFICATION_TYPES,
  NOTIFICATION_AUDIENCE,
  PROFILE_STATUS,
  ASSIGNMENT_STATUS,
  ROLES,
} from '../config/constants.js';

// Fields the client may legitimately send as part of a create/update payload.
// Anything else (workflow/audit fields) is stripped so it can never be set via user input.
// NOTE: assignedAdmin, assignedBy, assignedAt, claimedBy, claimedAt, and assignmentStatus
// are intentionally excluded so they can only be modified by the assignment workflow controllers below.
const ASSIGNABLE_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'maritalStatus',
  'country', 'state', 'city', 'congregation', 'baptismYear', 'circuitOverseerContact',
  'pioneerStatus', 'hoursPerMonth', 'meetingAttendance', 'spiritualGoals', 'qualities',
  'occupation', 'education', 'aboutMe', 'lookingFor',
  'relocation', 'hasChildren', 'preferredContact', 'bestTimeToContact',
];

// multipart/form-data sends repeated fields as "qualities[]" and multer/busboy will
// aggregate them into req.body['qualities[]'] (as a string if only one was sent, or
// an array if several were sent). Normalize that into a clean req.body.qualities array,
// and drop any field the client isn't allowed to set directly.
const normalizeProfileBody = (body = {}) => {
  const clean = {};

  for (const field of ASSIGNABLE_FIELDS) {
    if (body[field] !== undefined) clean[field] = body[field];
  }

  const rawQualities = body['qualities[]'] ?? body.qualities;
  if (rawQualities !== undefined) {
    clean.qualities = Array.isArray(rawQualities) ? rawQualities : [rawQualities];
    clean.qualities = clean.qualities.map((q) => String(q).trim()).filter(Boolean);
  }

  return clean;
};

// @desc    Public: submit a new profile (with optional image)
// @route   POST /api/v1/profiles
export const createProfile = asyncHandler(async (req, res) => {
  console.log('createProfile called', new Date().toISOString());
  const memberId = await generateMemberId();
  const payload = normalizeProfileBody(req.body);

  let profileImageUrl = null;
  let profileImagePublicId = null;
  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, 'profiles');
    profileImageUrl = uploaded.url;
    profileImagePublicId = uploaded.publicId;
  }

  const profile = await Profile.create({
    ...payload,
    memberId,
    profileImageUrl,
    profileImagePublicId,
    createdBy: req.admin?._id || null,
    statusHistory: [{ status: PROFILE_STATUS.PENDING, note: 'Profile submitted' }],
  });

  await queueEmail({
    to: profile.email,
    subject: 'Your profile has been received',
    template: EMAIL_TEMPLATES.REGISTRATION_CONFIRMATION,
    variables: { firstName: profile.firstName, memberId: profile.memberId },
  });

  await notify({
    type: NOTIFICATION_TYPES.PROFILE_SUBMITTED,
    title: 'New profile submitted',
    message: `${profile.fullName} (${profile.memberId}) submitted a new profile for review.`,
    link: '/1dama3na/admin.html#profiles',
    audience: NOTIFICATION_AUDIENCE.ADMIN_AND_ABOVE,
    relatedEntity: { kind: 'Profile', id: profile._id },
    sendEmailToo: true,
  });

  await logActivity({
    actor: req.admin || { _id: null, name: 'Public submission' },
    action: ACTIVITY_ACTIONS.PROFILE_CREATED,
    description: `Profile ${profile.memberId} was submitted`,
    targetEntity: { kind: 'Profile', id: profile._id },
    req,
  });

  sendSuccess(res, { statusCode: 201, message: 'Profile submitted successfully', data: { profile } });
});

// @desc    Advanced search / list profiles with filtering, sorting, pagination
// @route   GET /api/v1/profiles
export const searchProfiles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = buildSort(req.query.sort, ['createdAt', 'firstName', 'lastName', 'dateOfBirth', 'status'], { createdAt: -1 });

  const filter = {};
  const {
    q, memberId, name, email, country, congregation, status, gender, maritalStatus, minAge, maxAge,
    assignmentStatus, assignedAdmin,
  } = req.query;

  if (q) filter.$text = { $search: q };
  if (memberId) filter.memberId = new RegExp(memberId, 'i');
  if (name) {
    filter.$or = [{ firstName: new RegExp(name, 'i') }, { lastName: new RegExp(name, 'i') }];
  }
  if (email) filter.email = new RegExp(email, 'i');
  // country is now stored as a 2-letter ISO code, so match it exactly (case-insensitive
  // so a lowercase query param like ?country=ng still works against the uppercase value).
  if (country) filter.country = new RegExp(`^${country}$`, 'i');
  if (congregation) filter.congregation = new RegExp(congregation, 'i');
  if (status) filter.status = status;
  if (gender) filter.gender = gender;
  if (maritalStatus) filter.maritalStatus = maritalStatus;
  if (assignmentStatus) filter.assignmentStatus = assignmentStatus;
  if (assignedAdmin) filter.assignedAdmin = assignedAdmin;

  if (minAge || maxAge) {
    const now = new Date();
    filter.dateOfBirth = {};
    if (minAge) filter.dateOfBirth.$lte = new Date(now.getFullYear() - Number(minAge), now.getMonth(), now.getDate());
    if (maxAge) filter.dateOfBirth.$gte = new Date(now.getFullYear() - Number(maxAge) - 1, now.getMonth(), now.getDate());
  }

  // Coordinators only see approved profiles by default unless a status filter is explicitly requested and they have permission.
  const [items, total] = await Promise.all([
    Profile.find(filter).sort(sort).skip(skip).limit(limit).lean({ virtuals: true }),
    Profile.countDocuments(filter),
  ]);

  sendSuccess(res, { data: { profiles: items }, meta: buildMeta({ page, limit, total }) });
});

// @desc    Get a single profile by id
// @route   GET /api/v1/profiles/:id
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id)
    .populate('approvedBy', 'name email')
    .populate('createdBy', 'name email')
    .populate('assignedAdmin', 'name email role assignedCountries canHandleInternational')
    .populate('assignedBy', 'name email role assignedCountries canHandleInternational')
    .populate('claimedBy', 'name email role assignedCountries canHandleInternational');
  if (!profile) throw ApiError.notFound('Profile not found');
  sendSuccess(res, { data: { profile } });
});

// @desc    Update profile fields (admin edit)
// @route   PATCH /api/v1/profiles/:id
export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');

  const payload = normalizeProfileBody(req.body);

  Object.assign(profile, payload);
  await profile.save();

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.PROFILE_EDITED,
    description: `${req.admin.name} edited profile ${profile.memberId}`,
    targetEntity: { kind: 'Profile', id: profile._id },
    req,
  });

  sendSuccess(res, { message: 'Profile updated', data: { profile } });
});

// @desc    Upload/replace a profile image
// @route   POST /api/v1/profiles/:id/image
export const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('An image file is required');

  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');

  if (profile.profileImagePublicId) {
    await deleteImage(profile.profileImagePublicId);
  }

  const uploaded = await uploadImage(req.file.buffer, 'profiles');
  profile.profileImageUrl = uploaded.url;
  profile.profileImagePublicId = uploaded.publicId;
  await profile.save();

  sendSuccess(res, { message: 'Profile image updated', data: { profileImageUrl: profile.profileImageUrl } });
});

const changeStatus = async ({ profile, status, note, admin, req, activityAction, notificationTitle, notificationMessage, emailTemplate, emailSubject }) => {
  profile.status = status;
  profile.statusHistory.push({ status, changedBy: admin._id, note });

  if (status === PROFILE_STATUS.APPROVED) {
    profile.approvedBy = admin._id;
    profile.approvedAt = new Date();
    profile.rejectionReason = undefined;
    profile.suspendedReason = undefined;
  }
  if (status === PROFILE_STATUS.REJECTED) profile.rejectionReason = note;
  if (status === PROFILE_STATUS.SUSPENDED) profile.suspendedReason = note;

  await profile.save();

  await logActivity({
    actor: admin,
    action: activityAction,
    description: `${admin.name} set profile ${profile.memberId} to ${status}${note ? `: ${note}` : ''}`,
    targetEntity: { kind: 'Profile', id: profile._id },
    req,
  });

  if (emailTemplate) {
    await queueEmail({
      to: profile.email,
      subject: emailSubject,
      template: emailTemplate,
      variables: {
        firstName: profile.firstName,
        memberId: profile.memberId,
        reason: note || '',
      },
    });
  }

  if (notificationTitle) {
    await notify({
      type: NOTIFICATION_TYPES.PROFILE_APPROVED,
      title: notificationTitle,
      message: notificationMessage,
      link: '/1dama3na/admin.html#profiles',
      audience: NOTIFICATION_AUDIENCE.ADMIN_AND_ABOVE,
      relatedEntity: { kind: 'Profile', id: profile._id },
    });
  }

  return profile;
};

// @desc    Approve a pending profile
// @route   PATCH /api/v1/profiles/:id/approve
export const approveProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');

  await changeStatus({
    profile,
    status: PROFILE_STATUS.APPROVED,
    note: req.body.note,
    admin: req.admin,
    req,
    activityAction: ACTIVITY_ACTIONS.PROFILE_APPROVED,
    notificationTitle: 'Profile approved',
    notificationMessage: `${profile.fullName} (${profile.memberId}) was approved by ${req.admin.name}.`,
    emailTemplate: EMAIL_TEMPLATES.PROFILE_APPROVED,
    emailSubject: 'Your profile has been approved!',
  });

  sendSuccess(res, { message: 'Profile approved', data: { profile } });
});

// @desc    Reject a pending profile
// @route   PATCH /api/v1/profiles/:id/reject
export const rejectProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');
  if (!req.body.note) throw ApiError.badRequest('A rejection reason is required');

  await changeStatus({
    profile,
    status: PROFILE_STATUS.REJECTED,
    note: req.body.note,
    admin: req.admin,
    req,
    activityAction: ACTIVITY_ACTIONS.PROFILE_REJECTED,
  });

  sendSuccess(res, { message: 'Profile rejected', data: { profile } });
});

// @desc    Suspend an approved profile
// @route   PATCH /api/v1/profiles/:id/suspend
export const suspendProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');
  if (!req.body.note) throw ApiError.badRequest('A suspension reason is required');

  await changeStatus({
    profile,
    status: PROFILE_STATUS.SUSPENDED,
    note: req.body.note,
    admin: req.admin,
    req,
    activityAction: ACTIVITY_ACTIONS.PROFILE_SUSPENDED,
    emailTemplate: EMAIL_TEMPLATES.PROFILE_SUSPENDED,
    emailSubject: 'Your profile has been suspended',
  });

  sendSuccess(res, { message: 'Profile suspended', data: { profile } });
});

// @desc    Reactivate a suspended profile back to approved
// @route   PATCH /api/v1/profiles/:id/reactivate
export const reactivateProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');

  await changeStatus({
    profile,
    status: PROFILE_STATUS.APPROVED,
    note: req.body.note || 'Reactivated',
    admin: req.admin,
    req,
    activityAction: ACTIVITY_ACTIONS.PROFILE_REACTIVATED,
    emailTemplate: EMAIL_TEMPLATES.PROFILE_REACTIVATED,
    emailSubject: 'Your profile has been reactivated',
  });

  sendSuccess(res, { message: 'Profile reactivated', data: { profile } });
});

// @desc    Soft-delete a profile
// @route   DELETE /api/v1/profiles/:id
export const deleteProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');

  const deletionReason =
    req.body?.note ||
    req.body?.reason ||
    'No reason was provided.';

  profile.isDeleted = true;
  profile.deletedAt = new Date();
  profile.status = PROFILE_STATUS.DELETED;
  profile.statusHistory.push({
    status: PROFILE_STATUS.DELETED,
    changedBy: req.admin._id,
    note: deletionReason,
  });

  await profile.save();

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.PROFILE_DELETED,
    description: `${req.admin.name} deleted profile ${profile.memberId}`,
    targetEntity: { kind: 'Profile', id: profile._id },
    req,
  });

  await queueEmail({
    to: profile.email,
    subject: 'Your profile has been deleted',
    template: EMAIL_TEMPLATES.PROFILE_DELETED,
    variables: {
      firstName: profile.firstName,
      memberId: profile.memberId,
      reason: deletionReason,
    },
  });

  sendSuccess(res, { message: 'Profile deleted' });
});

// @desc    Get profiles that are compatible matches for a given profile (opposite gender, approved)
// @route   GET /api/v1/profiles/:id/suggestions
export const getMatchSuggestions = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');

  const oppositeGender = profile.gender === 'male' ? 'female' : 'male';
  const age = calculateAge(profile.dateOfBirth);

  const now = new Date();
  const candidates = await Profile.find({
    _id: { $ne: profile._id },
    gender: oppositeGender,
    status: PROFILE_STATUS.APPROVED,
    dateOfBirth: {
      $gte: new Date(now.getFullYear() - age - 15, now.getMonth(), now.getDate()),
      $lte: new Date(now.getFullYear() - age + 15, now.getMonth(), now.getDate()),
    },
  })
    .limit(20)
    .lean({ virtuals: true });

  sendSuccess(res, { data: { suggestions: candidates } });
});

// ---------------------------------------------------------------------------
// Profile assignment workflow
// ---------------------------------------------------------------------------

// @desc    Assign a profile to an admin (or reassign it)
// @route   PATCH /api/v1/profiles/:id/assign
export const assignProfileToAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.body;
  if (!adminId) throw ApiError.badRequest('adminId is required');

  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');

  const targetAdmin = await Admin.findById(adminId);
  if (!targetAdmin || !targetAdmin.isActive) {
    throw ApiError.badRequest('Target admin not found or inactive');
  }

  if (![ROLES.ADMIN, ROLES.COORDINATOR].includes(targetAdmin.role)) {
    throw ApiError.badRequest('Only admins or coordinators can receive profile assignments');
  }

  if (targetAdmin.canHandleInternational !== true) {
    const profileCountry = String(profile.country || '').toUpperCase();
    if (!targetAdmin.assignedCountries?.includes(profileCountry)) {
      throw ApiError.forbidden("Target admin is not assigned to this profile's country");
    }
  }

  profile.assignedAdmin = targetAdmin._id;
  profile.assignedBy = req.admin._id;
  profile.assignedAt = new Date();
  profile.assignmentStatus = ASSIGNMENT_STATUS.ASSIGNED;

  // Reassigning clears any prior claim so the new assignee starts fresh.
  profile.claimedBy = undefined;
  profile.claimedAt = undefined;

  await profile.save();
  await profile.populate([
    { path: 'assignedAdmin', select: 'name email role' },
    { path: 'assignedBy', select: 'name email role' },
    { path: 'claimedBy', select: 'name email role' },
  ]);

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.PROFILE_ASSIGNED,
    description: `${req.admin.name} assigned profile ${profile.memberId} to ${targetAdmin.name}`,
    targetEntity: { kind: 'Profile', id: profile._id },
    req,
  });

  sendSuccess(res, { message: 'Profile assigned successfully', data: { profile } });
});

// @desc    Claim a profile that has been assigned to the current admin
// @route   PATCH /api/v1/profiles/:id/claim
export const claimAssignedProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');

  const isSuperAdmin = req.admin.role === ROLES.SUPER_ADMIN;
  const isAssignedAdmin = profile.assignedAdmin && profile.assignedAdmin.toString() === req.admin._id.toString();

  if (!isSuperAdmin && !isAssignedAdmin) {
    throw ApiError.forbidden('You are not authorized to claim this profile');
  }

  if (profile.assignmentStatus !== ASSIGNMENT_STATUS.ASSIGNED) {
    throw ApiError.badRequest('Profile is not currently available to be claimed');
  }

  profile.claimedBy = req.admin._id;
  profile.claimedAt = new Date();
  profile.assignmentStatus = ASSIGNMENT_STATUS.CLAIMED;

  await profile.save();

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.PROFILE_CLAIMED,
    description: `${req.admin.name} claimed profile ${profile.memberId}`,
    targetEntity: { kind: 'Profile', id: profile._id },
    req,
  });

  sendSuccess(res, { message: 'Profile claimed successfully', data: { profile } });
});

// @desc    Mark a claimed profile assignment as completed
// @route   PATCH /api/v1/profiles/:id/complete-assignment
export const completeAssignedProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Profile not found');

  if (profile.assignmentStatus !== ASSIGNMENT_STATUS.CLAIMED) {
    throw ApiError.badRequest('Profile assignment must be claimed before it can be completed');
  }

  const isSuperAdmin = req.admin.role === ROLES.SUPER_ADMIN;
  const isClaimingAdmin = profile.claimedBy && profile.claimedBy.toString() === req.admin._id.toString();

  if (!isSuperAdmin && !isClaimingAdmin) {
    throw ApiError.forbidden('You are not authorized to complete this assignment');
  }

  profile.assignmentStatus = ASSIGNMENT_STATUS.COMPLETED;
  // assignedAdmin/assignedBy/assignedAt/claimedBy/claimedAt are left untouched to preserve history.
  await profile.save();

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.PROFILE_ASSIGNMENT_COMPLETED,
    description: `${req.admin.name} completed the assignment for profile ${profile.memberId}`,
    targetEntity: { kind: 'Profile', id: profile._id },
    req,
  });

  sendSuccess(res, { message: 'Profile assignment completed', data: { profile } });
});

// @desc    List profiles currently assigned to the requesting admin
// @route   GET /api/v1/profiles/my-assigned
export const getAssignedProfiles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = buildSort(req.query.sort, ['createdAt', 'firstName', 'lastName', 'assignedAt'], { assignedAt: -1 });

  const filter = {
    assignedAdmin: req.admin._id,
    isDeleted: { $ne: true },
  };

  const { assignmentStatus, status, country, gender, q } = req.query;

  if (assignmentStatus) filter.assignmentStatus = assignmentStatus;
  if (status) filter.status = status;
  if (country) filter.country = new RegExp(`^${String(country).toUpperCase()}$`, 'i');
  if (gender) filter.gender = gender;

  if (q) {
    filter.$or = [
      { firstName: new RegExp(q, 'i') },
      { lastName: new RegExp(q, 'i') },
      { memberId: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    Profile.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedAdmin', 'name email role')
      .populate('assignedBy', 'name email role')
      .populate('claimedBy', 'name email role')
      .lean({ virtuals: true }),
    Profile.countDocuments(filter),
  ]);

  sendSuccess(res, { data: { profiles: items }, meta: buildMeta({ page, limit, total }) });
});