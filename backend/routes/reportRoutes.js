import express from 'express';
import {
  getComprehensiveReport,
  getHrReport,
  getCrmReport,
  getProductionReport,
  getFinanceReport
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Cross-Module & Operational Reports
router.get('/comprehensive', getComprehensiveReport);
router.get('/operations', getComprehensiveReport);

// Module-Specific Reporting Hubs
router.get('/hr', getHrReport);
router.get('/crm', getCrmReport);
router.get('/production', getProductionReport);
router.get('/finance', getFinanceReport);

export default router;
