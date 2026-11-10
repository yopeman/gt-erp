import express from 'express';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  addDiscussion,
  convertLeadToCustomer,
  getLeadStatistics
} from '../controllers/leadController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/statistics', getLeadStatistics);
router.post('/:id/discussions', addDiscussion);
router.post('/:id/convert', convertLeadToCustomer);

router.route('/')
  .get(getLeads)
  .post(createLead);

router.route('/:id')
  .get(getLeadById)
  .put(updateLead)
  .delete(deleteLead);

export default router;

