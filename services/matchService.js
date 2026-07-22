import ApiError from '../utils/ApiError.js';
import { calculateAge } from './profileService.js';
import { getSettings } from '../models/Setting.js';
import { GENDER, PROFILE_STATUS } from '../config/constants.js';

/**
 * Validates that two profiles are eligible to be matched based on platform
 * match rules (age gap, minimum age, approved status, opposite gender).
 */
export const validateMatchEligibility = async (profileA, profileB) => {
  if (!profileA || !profileB) {
    throw ApiError.notFound('One or both profiles could not be found');
  }

  if (profileA.status !== PROFILE_STATUS.APPROVED || profileB.status !== PROFILE_STATUS.APPROVED) {
    throw ApiError.badRequest('Both profiles must be approved before they can be matched');
  }

  if (profileA.gender === profileB.gender) {
    throw ApiError.badRequest('Matched profiles must be of opposite gender');
  }

  const settings = await getSettings();
  const ageA = calculateAge(profileA.dateOfBirth);
  const ageB = calculateAge(profileB.dateOfBirth);

  if (ageA < settings.matchRules.minAge || ageB < settings.matchRules.minAge) {
    throw ApiError.badRequest(`Both profiles must be at least ${settings.matchRules.minAge} years old`);
  }

  const gap = Math.abs(ageA - ageB);
  if (gap > settings.matchRules.maxAgeGapYears) {
    throw ApiError.badRequest(`Age gap of ${gap} years exceeds the maximum allowed (${settings.matchRules.maxAgeGapYears})`);
  }

  if (settings.matchRules.requireSameCountryByDefault && profileA.country !== profileB.country) {
    throw ApiError.badRequest('Profiles must be in the same country per current match rules');
  }

  return true;
};

// Simple heuristic scoring (0-100) used as a starting suggestion; admins can override manually.
export const computeCompatibilityScore = (profileA, profileB) => {
  let score = 50;

  if (profileA.country === profileB.country) score += 15;
  if (profileA.congregation === profileB.congregation) score += 10;

  const ageGap = Math.abs(calculateAge(profileA.dateOfBirth) - calculateAge(profileB.dateOfBirth));
  score += Math.max(0, 15 - ageGap);

  const sharedQualities = (profileA.qualities || []).filter((q) => (profileB.qualities || []).includes(q));
  score += Math.min(10, sharedQualities.length * 2);

  return Math.max(0, Math.min(100, Math.round(score)));
};

export default { validateMatchEligibility, computeCompatibilityScore };
