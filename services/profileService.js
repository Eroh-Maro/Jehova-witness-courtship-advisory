import { getNextSequence } from '../models/Counter.js';

export const generateMemberId = async () => {
  const seq = await getNextSequence('profile_member_id');
  return `JW-${String(seq).padStart(6, '0')}`;
};

export const calculateAge = (dateOfBirth) => {
  const diff = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

export default { generateMemberId, calculateAge };
