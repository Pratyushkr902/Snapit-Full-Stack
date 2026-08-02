import { Router } from 'express'
import auth from '../middleware/auth.js'
import optionalAuth from '../middleware/optionalAuth.js'
import { admin } from '../middleware/Admin.js'
import { createSupportMessage, getSupportMessages } from '../controllers/supportMessage.controller.js'

const supportRouter = Router()

supportRouter.post('/message', optionalAuth, createSupportMessage) // guests + logged-in users
supportRouter.get('/messages', auth, admin, getSupportMessages)     // admin-only

export default supportRouter
