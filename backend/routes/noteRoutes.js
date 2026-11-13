import express from 'express';
import {
  getMyNotes,
  createNote,
  getNoteById,
  updateNote,
  togglePin,
  updateColor,
  toggleChecklistItem,
  addChecklistItem,
  deleteNote
} from '../controllers/noteController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotes);
router.post('/', createNote);
router.get('/:id', getNoteById);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

// Note fast-actions
router.patch('/:id/pin', togglePin);
router.patch('/:id/color', updateColor);
router.patch('/:id/checklist/:itemId', toggleChecklistItem);
router.post('/:id/checklist', addChecklistItem);

export default router;

