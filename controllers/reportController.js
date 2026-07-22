import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import Profile from "../models/Profile.js";
import Contact from "../models/Contact.js";
import Match from "../models/Match.js";
import ActivityLog from "../models/ActivityLog.js";
import { generateReport } from "../services/reportService.js";
import { getFullAnalytics } from "../services/analyticsService.js";
import { logActivity } from "../services/activityLogService.js";
import { ACTIVITY_ACTIONS } from "../config/constants.js";

const formatReportDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(date);
};

const formatReportRows = (rows, columns) => {
  const dateKeys = new Set([
    "createdAt",
    "updatedAt",
    "assignedAt",
    "claimedAt",
    "marriedAt",
  ]);

  return rows.map((row) => {
    const formattedRow = { ...row };

    columns.forEach(({ key }) => {
      if (dateKeys.has(key) && formattedRow[key]) {
        formattedRow[key] = formatReportDate(formattedRow[key]);
      }
    });

    return formattedRow;
  });
};

const REPORT_DEFS = {
  members: {
    title: "Members Report",
    columns: [
      { label: "Member ID", key: "memberId" },
      { label: "First Name", key: "firstName" },
      { label: "Last Name", key: "lastName" },
      { label: "Email", key: "email" },
      { label: "Gender", key: "gender" },
      { label: "Country", key: "country" },
      { label: "Congregation", key: "congregation" },
      { label: "Status", key: "status" },
      { label: "Created At", key: "createdAt" },
    ],
    fetch: () => Profile.find({}).lean(),
  },
  matches: {
    title: "Matches Report",
    columns: [
      { label: "Match ID", key: "_id" },
      { label: "Profile A", key: "profileAName" },
      { label: "Profile B", key: "profileBName" },
      { label: "Status", key: "status" },
      { label: "Compatibility", key: "compatibilityScore" },
      { label: "Created At", key: "createdAt" },
    ],
    fetch: async () => {
      const matches = await Match.find({})
        .populate("profileA", "firstName lastName")
        .populate("profileB", "firstName lastName")
        .lean();
      return matches.map((m) => ({
        ...m,
        profileAName: m.profileA
          ? `${m.profileA.firstName} ${m.profileA.lastName}`
          : "N/A",
        profileBName: m.profileB
          ? `${m.profileB.firstName} ${m.profileB.lastName}`
          : "N/A",
      }));
    },
  },
  contacts: {
    title: "Contacts Report",
    columns: [
      { label: "Name", key: "name" },
      { label: "Email", key: "email" },
      { label: "Subject", key: "subject" },
      { label: "Status", key: "status" },
      { label: "Created At", key: "createdAt" },
    ],
    fetch: () => Contact.find({}).lean(),
  },
  activityLogs: {
    title: "Activity Logs Report",
    columns: [
      { label: "Actor", key: "actorName" },
      { label: "Action", key: "action" },
      { label: "Description", key: "description" },
      { label: "IP Address", key: "ipAddress" },
      { label: "Date", key: "createdAt" },
    ],
    fetch: () =>
      ActivityLog.find({}).sort({ createdAt: -1 }).limit(5000).lean(),
  },
  analytics: {
    title: "Analytics Report",
    columns: [
      { label: "Metric", key: "metric" },
      { label: "Value", key: "value" },
    ],
    fetch: async () => {
      const a = await getFullAnalytics();
      return [
        { metric: "Total Profiles", value: a.dashboard.totalProfiles },
        { metric: "Pending Profiles", value: a.dashboard.pendingProfiles },
        { metric: "Approved Profiles", value: a.dashboard.approvedProfiles },
        { metric: "Total Contacts", value: a.dashboard.totalContacts },
        { metric: "Total Matches", value: a.dashboard.totalMatches },
        { metric: "Married Matches", value: a.dashboard.marriedMatches },
        { metric: "Approval Rate (%)", value: a.approvalRate.approvalRate },
        { metric: "Average Match Time (days)", value: a.averageMatchTimeDays },
      ];
    },
  },
};

// @desc    Export a report in pdf/excel/csv format
// @route   GET /api/v1/reports/:type?format=pdf|excel|csv
export const exportReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const format = (req.query.format || "pdf").toLowerCase();

  const def = REPORT_DEFS[type];
  if (!def) throw ApiError.badRequest(`Unknown report type: ${type}`);
  if (!["pdf", "excel", "xlsx", "csv"].includes(format))
    throw ApiError.badRequest(`Unsupported format: ${format}`);

  const rawRows = await def.fetch();
  const rows = formatReportRows(rawRows, def.columns);

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.REPORT_GENERATED,
    description: `${req.admin.name} generated a ${format.toUpperCase()} ${
      def.title
    }`,
    req,
  });

  await generateReport(res, format, {
    title: def.title,
    columns: def.columns,
    rows,
  });
});
