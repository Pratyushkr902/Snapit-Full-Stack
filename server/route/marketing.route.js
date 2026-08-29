import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import { broadcastCampaignController, getCampaignTemplatesController } from '../controllers/marketing.controller.js'

const marketingRouter = Router()

marketingRouter.get('/templates', auth, admin, getCampaignTemplatesController)
marketingRouter.post('/broadcast', auth, admin, broadcastCampaignController)

export default marketingRouter
