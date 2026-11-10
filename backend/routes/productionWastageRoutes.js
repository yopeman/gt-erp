import express from 'express';
import {
  getWastages,
  getWastageById,
  createWastage,
  approveWastage,
  deleteWastage
} from '../controllers/productionWastageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWastages)
  .post(createWastage);

router.route('/:id')
  .get(getWastageById)
  .delete(deleteWastage);

router.patch('/:id/approve', approveWastage);

export default router;

