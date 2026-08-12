import { Router } from 'express';
import {
  getDetailedReport,
  getSystemSettings,
  updateSystemSettings
} from '../controllers/managerDashboardController';

const router = Router();

// Route Báo cáo
router.get('/reports', getDetailedReport);

// Route Cấu hình
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

export default router;