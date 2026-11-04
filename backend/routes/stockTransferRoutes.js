import express from 'express';
import {
  createStockTransfer,
  getStockTransfers,
  getStockTransferById,
  approveStockTransfer,
  dispatchStockTransfer,
  receiveStockTransfer
} from '../controllers/stockTransferController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStockTransfers)
  .post(createStockTransfer);

router.route('/:id')
  .get(getStockTransferById);

router.post('/:id/approve', approveStockTransfer);
router.post('/:id/dispatch', dispatchStockTransfer);
router.post('/:id/receive', receiveStockTransfer);

export default router;

