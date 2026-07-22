import Contact from '../models/Contact.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, buildMeta, buildSort } from '../utils/pagination.js';
import { logActivity } from '../services/activityLogService.js';
import { notify } from '../services/notificationService.js';
import { queueEmail } from '../queues/emailQueue.js';
import { ACTIVITY_ACTIONS, EMAIL_TEMPLATES, NOTIFICATION_TYPES, NOTIFICATION_AUDIENCE, CONTACT_STATUS } from '../config/constants.js';

// @desc    Public: submit the contact form
// @route   POST /api/v1/contacts
export const createContact = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  const contact = await Contact.create({
    name,
    email,
    phone,
    subject,
    message,
    ipAddress: req.ip,
  });

  // Confirmation email to the person who submitted the form
  await queueEmail({
    to: email,
    subject: 'We received your message',
    template: EMAIL_TEMPLATES.CONTACT_CONFIRMATION,
    variables: {
      name,
      messagePreview: message.slice(0, 200),
    },
  });

  // Contact notification sent to the church info email
  await queueEmail({
    to: process.env.CONTACT_NOTIFICATION_EMAIL,
    subject: `New contact message${subject ? `: ${subject}` : ''}`,
    template: EMAIL_TEMPLATES.ADMIN_NOTIFICATION,
    variables: {
      notificationTitle: 'New contact message',
      notificationMessage: `${name} sent a message.

Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject || 'Not provided'}
Message: ${message}`,
      actionUrl: `${process.env.CLIENT_URL}/1dama3na/admin.html#contacts`,
    },
  });

  // Dashboard notification for admins
  await notify({
    type: NOTIFICATION_TYPES.CONTACT_RECEIVED,
    title: 'New contact message',
    message: `${name} sent a new message${subject ? `: "${subject}"` : ''}.`,
    link: '/1dama3na/admin.html#contacts',
    audience: NOTIFICATION_AUDIENCE.ADMIN_AND_ABOVE,
    relatedEntity: {
      kind: 'Contact',
      id: contact._id,
    },
    sendEmailToo: false,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Your message has been sent. We will get back to you shortly.',
    data: {
      contactId: contact._id,
    },
  });
});

// @desc    List/search contact messages
// @route   GET /api/v1/contacts
export const listContacts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = buildSort(req.query.sort, ['createdAt', 'status'], { createdAt: -1 });

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.$text = { $search: req.query.q };

  const [items, total] = await Promise.all([
    Contact.find(filter).populate('assignedTo', 'name email').sort(sort).skip(skip).limit(limit).lean(),
    Contact.countDocuments(filter),
  ]);

  sendSuccess(res, { data: { contacts: items }, meta: buildMeta({ page, limit, total }) });
});

// @desc    Get a single contact message
// @route   GET /api/v1/contacts/:id
export const getContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id).populate('assignedTo', 'name email').populate('replies.repliedBy', 'name email');
  if (!contact) throw ApiError.notFound('Contact message not found');
  sendSuccess(res, { data: { contact } });
});

// @desc    Reply to a contact message
// @route   POST /api/v1/contacts/:id/reply
export const replyContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) throw ApiError.notFound('Contact message not found');

  contact.replies.push({ message: req.body.message, repliedBy: req.admin._id });
  contact.status = CONTACT_STATUS.REPLIED;
  await contact.save();

  await queueEmail({
    to: contact.email,
    subject: `Re: ${contact.subject || 'Your message to us'}`,
    template: EMAIL_TEMPLATES.CONTACT_REPLY,
    variables: { name: contact.name, replyMessage: req.body.message, repliedByName: req.admin.name },
  });

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.CONTACT_REPLIED,
    description: `${req.admin.name} replied to a message from ${contact.name}`,
    targetEntity: { kind: 'Contact', id: contact._id },
    req,
  });

  sendSuccess(res, { message: 'Reply sent', data: { contact } });
});

// @desc    Update contact status/assignment
// @route   PATCH /api/v1/contacts/:id
export const updateContactStatus = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) throw ApiError.notFound('Contact message not found');

  if (req.body.status) contact.status = req.body.status;
  if (req.body.assignedTo !== undefined) contact.assignedTo = req.body.assignedTo || null;
  await contact.save();

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.CONTACT_STATUS_CHANGED,
    description: `${req.admin.name} updated contact status to ${contact.status}`,
    targetEntity: { kind: 'Contact', id: contact._id },
    req,
  });

  sendSuccess(res, { message: 'Contact updated', data: { contact } });
});

// @desc    Delete a contact message
// @route   DELETE /api/v1/contacts/:id
export const deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findByIdAndDelete(req.params.id);
  if (!contact) throw ApiError.notFound('Contact message not found');
  sendSuccess(res, { message: 'Contact message deleted' });
});
