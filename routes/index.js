import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import contactRoutes from './contactRoutes.js';
import matchRoutes from './matchRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import activityLogRoutes from './activityLogRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import reportRoutes from './reportRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.get('/health', (req, res) => res.status(200).json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/profiles', profileRoutes);
router.use('/contacts', contactRoutes);
router.use('/matches', matchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/admins', adminRoutes);

export default router;
