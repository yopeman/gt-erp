import express from 'express';
import {
  createGoodsReceipt,
  getGoodsReceipts,
  getGoodsReceiptById,
  acceptGoodsReceipt
} from '../controllers/goodsReceiptController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getGoodsReceipts)
  .post(createGoodsReceipt);

router.route('/:id')
  .get(getGoodsReceiptById);

router.post('/:id/accept', acceptGoodsReceipt);

export default router;

