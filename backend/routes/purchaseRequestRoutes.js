import express from 'express';
import {
  createPurchaseRequest,
  getPurchaseRequests,
  getPurchaseRequestById,
  handleApproval,
  convertToPurchaseOrder
} from '../controllers/purchaseRequestController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPurchaseRequests)
  .post(createPurchaseRequest);

router.route('/:id')
  .get(getPurchaseRequestById);

router.post('/:id/approve', handleApproval);
router.post('/:id/convert-to-po', convertToPurchaseOrder);

export default router;

