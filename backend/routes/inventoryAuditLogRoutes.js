import express from 'express';
import { getInventoryAuditLogs } from '../controllers/inventoryAuditLogController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getInventoryAuditLogs);

export default router;

