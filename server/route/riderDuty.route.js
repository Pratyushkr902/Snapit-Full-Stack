import express from 'express';
import auth from '../middleware/auth.js';
import { admin, rider } from '../middleware/Admin.js';
import {
  toggleDutyController,
  getRiderDutyStatusController,
  updateRiderLocationController,
  getAdminLiveRidersController
} from '../controllers/riderDuty.controller.js';

const riderDutyRouter = express.Router();

// Rider Duty Actions (Only delivery fleet or admin can toggle or update GPS)
riderDutyRouter.post('/toggle', auth, rider, toggleDutyController);
riderDutyRouter.get('/status', auth, rider, getRiderDutyStatusController);
riderDutyRouter.post('/location', auth, rider, updateRiderLocationController);

// Admin / Super Admin Live Fleet
riderDutyRouter.get('/admin/live-fleet', auth, admin, getAdminLiveRidersController);

export default riderDutyRouter;
