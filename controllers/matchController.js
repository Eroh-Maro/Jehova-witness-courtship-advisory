import Match from '../models/Match.js';
import Profile from '../models/Profile.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, buildMeta, buildSort } from '../utils/pagination.js';
import { validateMatchEligibility, computeCompatibilityScore } from '../services/matchService.js';
import { logActivity } from '../services/activityLogService.js';
import { notify } from '../services/notificationService.js';
import { queueEmail } from '../queues/emailQueue.js';
import { ACTIVITY_ACTIONS, EMAIL_TEMPLATES, NOTIFICATION_TYPES, NOTIFICATION_AUDIENCE, MATCH_STATUS } from '../config/constants.js';

// @desc    Create a new suggested match between two profiles
// @route   POST /api/v1/matches
export const createMatch = asyncHandler(async (req, res) => {
  const { profileA: idA, profileB: idB, note } = req.body;

  const [profileA, profileB] = await Promise.all([Profile.findById(idA), Profile.findById(idB)]);
  await validateMatchEligibility(profileA, profileB);

  const existing = await Match.findOne({
    $or: [
      { profileA: idA, profileB: idB },
      { profileA: idB, profileB: idA },
    ],
  });
  if (existing) throw ApiError.conflict('A match between these two profiles already exists');

  const compatibilityScore = computeCompatibilityScore(profileA, profileB);

  const match = await Match.create({
    profileA: idA,
    profileB: idB,
    compatibilityScore,
    createdBy: req.admin._id,
    statusHistory: [{ status: MATCH_STATUS.SUGGESTED, changedBy: req.admin._id, note }],
    notes: note ? [{ text: note, addedBy: req.admin._id }] : [],
  });

  await Promise.all(
    [profileA, profileB].map((p) =>
      queueEmail({
        to: p.email,
        subject: 'A new match has been suggested for you',
        template: EMAIL_TEMPLATES.MATCH_NOTIFICATION,
        variables: { firstName: p.firstName },
      })
    )
  );

  await notify({
    type: NOTIFICATION_TYPES.MATCH_CREATED,
    title: 'New match created',
    message: `${req.admin.name} matched ${profileA.fullName} with ${profileB.fullName}.`,
    link: '/1dama3na/admin.html#matches',
    audience: NOTIFICATION_AUDIENCE.ADMIN_AND_ABOVE,
    relatedEntity: { kind: 'Match', id: match._id },
  });

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.MATCH_CREATED,
    description: `${req.admin.name} created a match between ${profileA.memberId} and ${profileB.memberId}`,
    targetEntity: { kind: 'Match', id: match._id },
    req,
  });

  sendSuccess(res, { statusCode: 201, message: 'Match created', data: { match } });
});

// @desc    List/search matches
// @route   GET /api/v1/matches
export const listMatches = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = buildSort(req.query.sort, ['createdAt', 'status', 'compatibilityScore'], { createdAt: -1 });

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.profileId) filter.$or = [{ profileA: req.query.profileId }, { profileB: req.query.profileId }];

  const [items, total] = await Promise.all([
    Match.find(filter)
      .populate('profileA', 'firstName lastName memberId profileImageUrl gender')
      .populate('profileB', 'firstName lastName memberId profileImageUrl gender')
      .populate('createdBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Match.countDocuments(filter),
  ]);

  sendSuccess(res, { data: { matches: items }, meta: buildMeta({ page, limit, total }) });
});

// @desc    Get a single match
// @route   GET /api/v1/matches/:id
export const getMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('profileA')
    .populate('profileB')
    .populate('createdBy', 'name email')
    .populate('notes.addedBy', 'name')
    .populate('statusHistory.changedBy', 'name');
  if (!match) throw ApiError.notFound('Match not found');
  sendSuccess(res, { data: { match } });
});

// @desc    Update the status of a match (advances the workflow)
// @route   PATCH /api/v1/matches/:id/status
export const updateMatchStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const match = await Match.findById(req.params.id).populate('profileA').populate('profileB');
  if (!match) throw ApiError.notFound('Match not found');

  match.status = status;
  match.statusHistory.push({ status, changedBy: req.admin._id, note });
  if (status === MATCH_STATUS.MARRIED) match.marriedAt = new Date();
  if (status === MATCH_STATUS.ARCHIVED) match.archivedReason = note;

  await match.save();

  await notify({
    type: NOTIFICATION_TYPES.MATCH_STATUS_CHANGED,
    title: 'Match status updated',
    message: `Match between ${match.profileA.fullName} and ${match.profileB.fullName} moved to "${status}".`,
    link: '/1dama3na/admin.html#matches',
    audience: NOTIFICATION_AUDIENCE.ADMIN_AND_ABOVE,
    relatedEntity: { kind: 'Match', id: match._id },
  });

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.MATCH_STATUS_CHANGED,
    description: `${req.admin.name} moved match ${match._id} to ${status}`,
    targetEntity: { kind: 'Match', id: match._id },
    req,
  });

  sendSuccess(res, { message: 'Match status updated', data: { match } });
});

// @desc    Add a note to a match
// @route   POST /api/v1/matches/:id/notes
export const addMatchNote = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) throw ApiError.notFound('Match not found');

  match.notes.push({ text: req.body.text, addedBy: req.admin._id });
  await match.save();

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.MATCH_UPDATED,
    description: `${req.admin.name} added a note to match ${match._id}`,
    targetEntity: { kind: 'Match', id: match._id },
    req,
  });

  sendSuccess(res, { message: 'Note added', data: { match } });
});

// @desc    Archive/delete a match record
// @route   DELETE /api/v1/matches/:id
export const deleteMatch = asyncHandler(async (req, res) => {
  const match = await Match.findByIdAndDelete(req.params.id);
  if (!match) throw ApiError.notFound('Match not found');

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.MATCH_UPDATED,
    description: `${req.admin.name} deleted match ${req.params.id}`,
    targetEntity: { kind: 'Match', id: req.params.id },
    req,
  });

  sendSuccess(res, { message: 'Match deleted' });
});
