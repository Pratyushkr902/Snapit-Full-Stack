import express from 'express';
import auth from '../middleware/auth.js';
import { admin, rider } from '../middleware/Admin.js';
import {
  submitRemittanceController,
  getRiderRemittancesController,
  getAllRemittancesAdminController,
  approveRemittanceController,
  rejectRemittanceController
} from '../controllers/riderRemittance.controller.js';

const riderRemittanceRouter = express.Router();

// Rider Actions (Only delivery fleet or admin can submit cash remittances)
riderRemittanceRouter.post('/submit', auth, rider, submitRemittanceController);
riderRemittanceRouter.get('/my-history', auth, rider, getRiderRemittancesController);

// Super Admin / Admin Actions
riderRemittanceRouter.get('/admin/all', auth, admin, getAllRemittancesAdminController);
riderRemittanceRouter.post('/admin/approve', auth, admin, approveRemittanceController);
riderRemittanceRouter.post('/admin/reject', auth, admin, rejectRemittanceController);

export default riderRemittanceRouter;
