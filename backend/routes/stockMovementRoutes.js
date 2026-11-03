import express from 'express';
import {
  getStockMovements,
  getStockMovementById,
  createStockMovement
} from '../controllers/stockMovementController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStockMovements)
  .post(createStockMovement);

router.route('/:id')
  .get(getStockMovementById);

export default router;

