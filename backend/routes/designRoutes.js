import express from 'express';
import {
  getDesigns,
  getDesignByOrder,
  createDesign,
  addDesignVersion,
  reviewDesignVersion
} from '../controllers/designController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/order/:orderId', getDesignByOrder);
router.post('/:id/versions', addDesignVersion);
router.patch('/:id/versions/:versionId/review', reviewDesignVersion);

router.route('/')
  .get(getDesigns)
  .post(createDesign);

export default router;

