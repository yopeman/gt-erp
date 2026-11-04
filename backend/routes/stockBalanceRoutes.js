import express from 'express';
import {
  getStockBalances,
  getStockBalanceById,
  getStockByWarehouse,
  getStockByItem
} from '../controllers/stockBalanceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStockBalances);

router.route('/:id')
  .get(getStockBalanceById);

router.get('/warehouse/:warehouseId', getStockByWarehouse);
router.get('/item/:itemId', getStockByItem);

export default router;

