import express from 'express';
import {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  updateMachineStatus,
  deleteMachine,
  getMachineStats
} from '../controllers/machineController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getMachineStats);

router.route('/')
  .get(getMachines)
  .post(createMachine);

router.route('/:id')
  .get(getMachineById)
  .put(updateMachine)
  .delete(deleteMachine);

router.patch('/:id/status', updateMachineStatus);

export default router;

