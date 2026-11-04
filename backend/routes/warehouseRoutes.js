import express from 'express';
import {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse
} from '../controllers/warehouseController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWarehouses)
  .post(createWarehouse);

router.route('/:id')
  .get(getWarehouseById)
  .put(updateWarehouse)
  .delete(deleteWarehouse);

export default router;

