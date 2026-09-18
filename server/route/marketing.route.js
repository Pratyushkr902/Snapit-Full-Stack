import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import {
  broadcastCampaignController,
  getCampaignTemplatesController,
  triggerScheduleController,
  getAbandonedCartsController,
  nudgeSingleCartController
} from '../controllers/marketing.controller.js'

const marketingRouter = Router()

marketingRouter.get('/templates', auth, admin, getCampaignTemplatesController)
marketingRouter.post('/broadcast', auth, admin, broadcastCampaignController)
marketingRouter.post('/trigger-schedule', auth, admin, triggerScheduleController)
marketingRouter.get('/abandoned-carts', auth, admin, getAbandonedCartsController)
marketingRouter.post('/nudge-cart', auth, admin, nudgeSingleCartController)

export default marketingRouter

