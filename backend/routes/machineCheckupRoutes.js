import express from 'express';
import {
  getCheckups,
  getCheckupById,
  createCheckup,
  deleteCheckup
} from '../controllers/machineCheckupController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCheckups)
  .post(createCheckup);

router.route('/:id')
  .get(getCheckupById)
  .delete(deleteCheckup);

export default router;

