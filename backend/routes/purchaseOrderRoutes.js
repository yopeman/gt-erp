import express from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  approvePurchaseOrder,
  sendPurchaseOrderToSupplier
} from '../controllers/purchaseOrderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPurchaseOrders)
  .post(createPurchaseOrder);

router.route('/:id')
  .get(getPurchaseOrderById)
  .put(updatePurchaseOrder);

router.post('/:id/approve', approvePurchaseOrder);
router.post('/:id/send', sendPurchaseOrderToSupplier);

export default router;

