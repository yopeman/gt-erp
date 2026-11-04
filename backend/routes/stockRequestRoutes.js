import express from 'express';
import {
  createStockRequest,
  getStockRequests,
  getStockRequestById,
  approveStockRequest,
  issueStockRequest
} from '../controllers/stockRequestController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStockRequests)
  .post(createStockRequest);

router.route('/:id')
  .get(getStockRequestById);

router.post('/:id/approve', approveStockRequest);
router.post('/:id/issue', issueStockRequest);

export default router;

