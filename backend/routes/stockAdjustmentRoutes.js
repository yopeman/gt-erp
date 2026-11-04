import express from 'express';
import {
  createStockAdjustment,
  getStockAdjustments,
  getStockAdjustmentById,
  handleApproval
} from '../controllers/stockAdjustmentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStockAdjustments)
  .post(createStockAdjustment);

router.route('/:id')
  .get(getStockAdjustmentById);

router.post('/:id/approve', handleApproval);

export default router;

