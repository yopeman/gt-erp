import express from 'express';
import {
  createSupplierReturn,
  getSupplierReturns,
  getSupplierReturnById,
  approveSupplierReturn
} from '../controllers/supplierReturnController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSupplierReturns)
  .post(createSupplierReturn);

router.route('/:id')
  .get(getSupplierReturnById);

router.post('/:id/approve', approveSupplierReturn);

export default router;

