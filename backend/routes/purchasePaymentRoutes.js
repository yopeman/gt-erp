import express from 'express';
import {
  createPurchasePayment,
  getPurchasePayments,
  getPurchasePaymentById,
  approvePurchasePayment
} from '../controllers/purchasePaymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPurchasePayments)
  .post(createPurchasePayment);

router.route('/:id')
  .get(getPurchasePaymentById);

router.post('/:id/approve', approvePurchasePayment);

export default router;

