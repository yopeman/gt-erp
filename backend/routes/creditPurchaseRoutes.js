import express from 'express';
import {
  getCreditPurchases,
  getCreditPurchasingDashboard,
  getAccountsPayableAgingReport,
  getSupplierCreditLedger,
  settleCreditPurchase,
  extendCreditDueDate
} from '../controllers/creditPurchaseController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Dashboard and Analytics
router.get('/dashboard', getCreditPurchasingDashboard);
router.get('/aging-report', getAccountsPayableAgingReport);

// Supplier Credit Ledger / Statement of Account
router.get('/suppliers/:supplierId/ledger', getSupplierCreditLedger);

// Credit Purchase Settlement
router.post('/settle', settleCreditPurchase);

// Extend / update credit due date
router.patch('/:id/extend-due-date', extendCreditDueDate);

// Credit purchases listing with filters
router.get('/', getCreditPurchases);

export default router;

