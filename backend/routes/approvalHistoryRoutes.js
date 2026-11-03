import express from 'express';
import { getApprovalHistory } from '../controllers/approvalHistoryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getApprovalHistory);

export default router;

