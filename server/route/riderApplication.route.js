import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import { riderApplicationLimiter } from '../middleware/security.js'
import {
  applyRiderController,
  getAllRiderApplicationsController,
  approveRiderApplicationController,
  rejectRiderApplicationController
} from '../controllers/riderApplication.controller.js'

const riderApplicationRouter = Router()

// Public / Candidate endpoint (rate limited)
riderApplicationRouter.post('/apply', riderApplicationLimiter, applyRiderController)

// Admin-only endpoints
riderApplicationRouter.get('/all', auth, admin, getAllRiderApplicationsController)
riderApplicationRouter.post('/approve', auth, admin, approveRiderApplicationController)
riderApplicationRouter.post('/reject', auth, admin, rejectRiderApplicationController)

export default riderApplicationRouter

