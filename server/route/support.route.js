import { Router } from 'express'
import auth from '../middleware/auth.js'
import optionalAuth from '../middleware/optionalAuth.js'
import { admin } from '../middleware/Admin.js'
import { createSupportMessage, getSupportMessages } from '../controllers/supportMessage.controller.js'

const supportRouter = Router()

// Static Contact & Feedback Form endpoints (email-based)
supportRouter.post('/contact-form', optionalAuth, createSupportMessage)
supportRouter.post('/email-message', optionalAuth, createSupportMessage)
supportRouter.get('/email-messages', auth, admin, getSupportMessages)

// Backwards-compatible aliases (for /api/support-email/message)
supportRouter.post('/message', optionalAuth, createSupportMessage)
supportRouter.get('/messages', auth, admin, getSupportMessages)

export default supportRouter
