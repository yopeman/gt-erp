import express from 'express';
import {
  createInvoice,
  createInvoiceFromOrder,
  getInvoices,
  getInvoiceById,
  getInvoiceMetrics
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/metrics', getInvoiceMetrics);
router.post('/from-order/:orderId', createInvoiceFromOrder);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.route('/:id')
  .get(getInvoiceById);

export default router;

