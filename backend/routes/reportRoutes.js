import express from 'express';
import { getComprehensiveReport } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/comprehensive', getComprehensiveReport);
router.get('/operations', getComprehensiveReport);

export default router;

