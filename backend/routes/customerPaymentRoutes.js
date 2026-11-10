import express from 'express';
import {
  recordCustomerPayment,
  getCustomerPayments,
  getCustomerPaymentById
} from '../controllers/customerPaymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCustomerPayments)
  .post(recordCustomerPayment);

router.route('/:id')
  .get(getCustomerPaymentById);

export default router;

