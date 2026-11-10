import express from 'express';
import {
  getProductionJobs,
  getProductionJobById,
  createProductionJob,
  updateProductionJob,
  startStage,
  completeStage,
  signoffQC,
  deleteProductionJob,
  getProductionDashboardMetrics
} from '../controllers/productionJobController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/metrics', getProductionDashboardMetrics);

router.route('/')
  .get(getProductionJobs)
  .post(createProductionJob);

router.route('/:id')
  .get(getProductionJobById)
  .put(updateProductionJob)
  .delete(deleteProductionJob);

router.post('/:id/stages/:stageId/start', startStage);
router.post('/:id/stages/:stageId/complete', completeStage);
router.post('/:id/stages/:stageId/qc', signoffQC);

export default router;
