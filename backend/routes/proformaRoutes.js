import express from 'express';
import {
  createProforma,
  createProformaFromOrder,
  getProformas,
  getProformaById,
  updateProformaStatus,
  deleteProforma
} from '../controllers/proformaController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/from-order/:orderId', createProformaFromOrder);
router.patch('/:id/status', updateProformaStatus);

router.route('/')
  .get(getProformas)
  .post(createProforma);

router.route('/:id')
  .get(getProformaById)
  .delete(deleteProforma);

export default router;

