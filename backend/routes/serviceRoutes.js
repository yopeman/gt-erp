import express from 'express';
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService
} from '../controllers/serviceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getServices)
  .post(createService);

router.route('/:id')
  .get(getServiceById)
  .put(updateService)
  .delete(deleteService);

export default router;

