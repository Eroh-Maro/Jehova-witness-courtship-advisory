import Profile from '../models/Profile.js';
import Contact from '../models/Contact.js';
import Match from '../models/Match.js';
import { PROFILE_STATUS, CONTACT_STATUS, MATCH_STATUS, GENDER } from '../config/constants.js';

const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

export const getDashboardStats = async () => {
  const [
    totalProfiles,
    pendingProfiles,
    approvedProfiles,
    suspendedProfiles,
    totalContacts,
    newContacts,
    totalMatches,
    activeMatches,
    marriedMatches,
    profilesThisMonth,
    profilesLastMonth,
  ] = await Promise.all([
    Profile.countDocuments({}),
    Profile.countDocuments({ status: PROFILE_STATUS.PENDING }),
    Profile.countDocuments({ status: PROFILE_STATUS.APPROVED }),
    Profile.countDocuments({ status: PROFILE_STATUS.SUSPENDED }),
    Contact.countDocuments({}),
    Contact.countDocuments({ status: CONTACT_STATUS.NEW }),
    Match.countDocuments({}),
    Match.countDocuments({ status: { $nin: [MATCH_STATUS.MARRIED, MATCH_STATUS.ARCHIVED] } }),
    Match.countDocuments({ status: MATCH_STATUS.MARRIED }),
    Profile.countDocuments({ createdAt: { $gte: monthsAgo(1) } }),
    Profile.countDocuments({ createdAt: { $gte: monthsAgo(2), $lt: monthsAgo(1) } }),
  ]);

  const growthPercent = profilesLastMonth === 0 ? 100 : Math.round(((profilesThisMonth - profilesLastMonth) / profilesLastMonth) * 100);

  return {
    totalProfiles,
    pendingProfiles,
    approvedProfiles,
    suspendedProfiles,
    totalContacts,
    newContacts,
    totalMatches,
    activeMatches,
    marriedMatches,
    profilesThisMonth,
    profilesLastMonth,
    monthlyGrowthPercent: growthPercent,
  };
};

export const getMonthlyRegistrations = async (monthsBack = 12) => {
  const since = monthsAgo(monthsBack);
  const results = await Profile.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
  return results.map((r) => ({ year: r._id.year, month: r._id.month, count: r.count }));
};

export const getGenderRatio = async () => {
  const results = await Profile.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]);
  const map = { [GENDER.MALE]: 0, [GENDER.FEMALE]: 0 };
  results.forEach((r) => {
    map[r._id] = r.count;
  });
  return map;
};

export const getAgeDistribution = async () => {
  const buckets = [
    { label: '18-24', min: 18, max: 24 },
    { label: '25-30', min: 25, max: 30 },
    { label: '31-36', min: 31, max: 36 },
    { label: '37-45', min: 37, max: 45 },
    { label: '46+', min: 46, max: 200 },
  ];

  const now = new Date();
  const results = await Promise.all(
    buckets.map(async (b) => {
      const maxDob = new Date(now.getFullYear() - b.min, now.getMonth(), now.getDate());
      const minDob = new Date(now.getFullYear() - b.max - 1, now.getMonth(), now.getDate());
      const count = await Profile.countDocuments({ dateOfBirth: { $gt: minDob, $lte: maxDob } });
      return { label: b.label, count };
    })
  );
  return results;
};

export const getTopCountries = async (limit = 10) =>
  Profile.aggregate([
    { $group: { _id: '$country', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, country: '$_id', count: 1 } },
  ]);

export const getMostActiveCongregations = async (limit = 10) =>
  Profile.aggregate([
    { $group: { _id: '$congregation', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, congregation: '$_id', count: 1 } },
  ]);

export const getProfileApprovalRate = async () => {
  const [approved, rejected, total] = await Promise.all([
    Profile.countDocuments({ status: PROFILE_STATUS.APPROVED }),
    Profile.countDocuments({ status: PROFILE_STATUS.REJECTED }),
    Profile.countDocuments({}),
  ]);
  const decided = approved + rejected;
  return {
    approved,
    rejected,
    total,
    approvalRate: decided === 0 ? null : Math.round((approved / decided) * 100),
  };
};

export const getAverageMatchTimeDays = async () => {
  const married = await Match.find({ status: MATCH_STATUS.MARRIED, marriedAt: { $ne: null } }).select('createdAt marriedAt').lean();
  if (married.length === 0) return null;
  const totalDays = married.reduce((sum, m) => sum + (new Date(m.marriedAt) - new Date(m.createdAt)) / (1000 * 60 * 60 * 24), 0);
  return Math.round(totalDays / married.length);
};

export const getFullAnalytics = async () => {
  const [
    dashboard,
    monthlyRegistrations,
    genderRatio,
    ageDistribution,
    topCountries,
    mostActiveCongregations,
    approvalRate,
    averageMatchTimeDays,
    pendingProfiles,
    pendingContacts,
    successfulMatches,
  ] = await Promise.all([
    getDashboardStats(),
    getMonthlyRegistrations(),
    getGenderRatio(),
    getAgeDistribution(),
    getTopCountries(),
    getMostActiveCongregations(),
    getProfileApprovalRate(),
    getAverageMatchTimeDays(),
    Profile.countDocuments({ status: PROFILE_STATUS.PENDING }),
    Contact.countDocuments({ status: CONTACT_STATUS.NEW }),
    Match.countDocuments({ status: MATCH_STATUS.MARRIED }),
  ]);

  return {
    dashboard,
    monthlyRegistrations,
    genderRatio,
    ageDistribution,
    topCountries,
    mostActiveCongregations,
    approvalRate,
    averageMatchTimeDays,
    pendingProfiles,
    pendingContacts,
    successfulMatches,
  };
};

export default {
  getDashboardStats,
  getMonthlyRegistrations,
  getGenderRatio,
  getAgeDistribution,
  getTopCountries,
  getMostActiveCongregations,
  getProfileApprovalRate,
  getAverageMatchTimeDays,
  getFullAnalytics,
};
