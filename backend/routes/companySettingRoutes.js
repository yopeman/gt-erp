import express from 'express';
import {
  getCompanySetting,
  updateCompanySetting,
  addOfficeLocation,
  updateOfficeLocation,
  deleteOfficeLocation,
  getHolidays,
  createHoliday,
  deleteHoliday
} from '../controllers/companySettingController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

// Company HR Settings
router.get('/', getCompanySetting);
router.put('/', authorizeRoles('admin', 'hr'), updateCompanySetting);
router.post('/office-locations', authorizeRoles('admin', 'hr'), addOfficeLocation);
router.put('/office-locations/:id', authorizeRoles('admin', 'hr'), updateOfficeLocation);
router.delete('/office-locations/:id', authorizeRoles('admin', 'hr'), deleteOfficeLocation);

// Public Holidays
router.get('/holidays', getHolidays);
router.post('/holidays', authorizeRoles('admin', 'hr'), createHoliday);
router.delete('/holidays/:id', authorizeRoles('admin', 'hr'), deleteHoliday);

export default router;

