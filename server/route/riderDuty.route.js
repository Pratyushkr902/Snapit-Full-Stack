import express from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import {
  toggleDutyController,
  getRiderDutyStatusController,
  updateRiderLocationController,
  getAdminLiveRidersController
} from '../controllers/riderDuty.controller.js';

const riderDutyRouter = express.Router();

// Rider Duty Actions
riderDutyRouter.post('/toggle', auth, toggleDutyController);
riderDutyRouter.get('/status', auth, getRiderDutyStatusController);
riderDutyRouter.post('/location', auth, updateRiderLocationController);

// Admin / Super Admin Live Fleet
riderDutyRouter.get('/admin/live-fleet', auth, admin, getAdminLiveRidersController);

export default riderDutyRouter;
