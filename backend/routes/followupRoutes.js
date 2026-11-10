import express from 'express';
import {
  createFollowup,
  getFollowups,
  getFollowupById,
  updateFollowup,
  completeFollowup,
  deleteFollowup,
  getFollowupMetrics
} from '../controllers/followupController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/metrics', getFollowupMetrics);
router.post('/:id/complete', completeFollowup);

router.route('/')
  .get(getFollowups)
  .post(createFollowup);

router.route('/:id')
  .get(getFollowupById)
  .put(updateFollowup)
  .delete(deleteFollowup);

export default router;

