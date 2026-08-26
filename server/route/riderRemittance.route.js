import express from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import {
  submitRemittanceController,
  getRiderRemittancesController,
  getAllRemittancesAdminController,
  approveRemittanceController,
  rejectRemittanceController
} from '../controllers/riderRemittance.controller.js';

const riderRemittanceRouter = express.Router();

// Rider Actions
riderRemittanceRouter.post('/submit', auth, submitRemittanceController);
riderRemittanceRouter.get('/my-history', auth, getRiderRemittancesController);

// Super Admin / Admin Actions
riderRemittanceRouter.get('/admin/all', auth, admin, getAllRemittancesAdminController);
riderRemittanceRouter.post('/admin/approve', auth, admin, approveRemittanceController);
riderRemittanceRouter.post('/admin/reject', auth, admin, rejectRemittanceController);

export default riderRemittanceRouter;
