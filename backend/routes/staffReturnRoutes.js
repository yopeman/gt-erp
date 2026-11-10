import express from 'express';
import {
  createStaffReturn,
  getStaffReturns,
  getStaffReturnById,
  receiveStaffReturn,
  rejectStaffReturn
} from '../controllers/staffReturnController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStaffReturns)
  .post(createStaffReturn);

router.route('/:id')
  .get(getStaffReturnById);

router.post('/:id/receive', receiveStaffReturn);
router.post('/:id/reject', rejectStaffReturn);

export default router;

