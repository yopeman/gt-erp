import express from 'express';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  addSupplierDocument,
  getSupplierCreditSummary
} from '../controllers/supplierController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSuppliers)
  .post(createSupplier);

router.route('/:id')
  .get(getSupplierById)
  .put(updateSupplier)
  .delete(deleteSupplier);

router.post('/:id/documents', addSupplierDocument);
router.get('/:id/credit-summary', getSupplierCreditSummary);

export default router;

