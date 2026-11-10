import express from 'express';
import {
  getMaintenances,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  startMaintenance,
  completeMaintenance,
  deleteMaintenance
} from '../controllers/machineMaintenanceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMaintenances)
  .post(createMaintenance);

router.route('/:id')
  .get(getMaintenanceById)
  .put(updateMaintenance)
  .delete(deleteMaintenance);

router.patch('/:id/start', startMaintenance);
router.post('/:id/complete', completeMaintenance);

export default router;

