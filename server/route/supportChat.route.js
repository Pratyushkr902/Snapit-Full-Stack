import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import {
  getMyChatController,
  sendUserMessageController,
  getAdminChatsController,
  getAdminChatByIdController,
  sendAdminMessageController,
  updateChatStatusController,
} from '../controllers/supportChat.controller.js'

const supportChatRouter = Router()

// Customer endpoints
supportChatRouter.get('/my-chat', auth, getMyChatController)
supportChatRouter.post('/message', auth, sendUserMessageController)

// Admin Helpdesk endpoints
supportChatRouter.get('/admin/chats', auth, admin, getAdminChatsController)
supportChatRouter.get('/admin/chat/:id', auth, admin, getAdminChatByIdController)
supportChatRouter.post('/admin/chat/:id/message', auth, admin, sendAdminMessageController)
supportChatRouter.put('/admin/chat/:id/status', auth, admin, updateChatStatusController)

export default supportChatRouter
