import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';
import { ROLES } from '../config/constants.js';
import logger from './logger.js';

const run = async () => {
  await connectDB();

  const email = process.env.SUPER_ADMIN_EMAIL;
  const existing = await Admin.findOne({ email });

  if (existing) {
    logger.info(`Super admin already exists: ${email}`);
  } else {
    await Admin.create({
      name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
      email,
      password: process.env.SUPER_ADMIN_PASSWORD,
      role: ROLES.SUPER_ADMIN,
    });
    logger.info(`Super admin created: ${email}`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
