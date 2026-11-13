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
router.get('/store', (req, res) => {
  req.query.actor = req.query.actor || 'storekeeper';
  return getComprehensiveReport(req, res);
});
router.get('/purchasing', (req, res) => {
  req.query.actor = req.query.actor || 'purchaser';
  return getComprehensiveReport(req, res);
});
router.get('/hr', getHrReport);
router.get('/crm', getCrmReport);
router.get('/production', getProductionReport);
router.get('/finance', getFinanceReport);

export default router;
