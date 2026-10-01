import mongoose from 'mongoose'
import SupportChatModel from '../models/supportChat.model.js'
import UserModel from '../models/user.model.js'
import sendEmail from './sendEmail.js'

export async function getMyChatController(request, response) {
  try {
    const userId = request.userId
    if (!userId) {
      return response.status(401).json({ message: 'Unauthorized', error: true, success: false })
    }

    let chat = await SupportChatModel.findOne({ userId })

    if (!chat) {
      const user = await UserModel.findById(userId).select('name email mobile').lean()
      chat = await SupportChatModel.create({
        userId,
        userName: user?.name || 'Customer',
        userEmail: user?.email || '',
        userMobile: user?.mobile || '',
        messages: [
          {
            sender: 'bot',
            senderName: 'Snapit Assistant',
            text: `Hi ${user?.name ? user.name.split(' ')[0] : 'there'}! 👋 Welcome to Snapit 24/7 Support. How can we help you today?`,
            createdAt: new Date(),
          },
        ],
        lastMessage: 'Welcome to Snapit 24/7 Support.',
        lastSender: 'bot',
        lastMessageAt: new Date(),
      })
    } else {
      // Clear user unread counter when viewing
      if (chat.unreadCountUser > 0) {
        chat.unreadCountUser = 0
        await chat.save()
      }
    }

    return response.json({
      message: 'Support chat loaded',
      data: chat,
      success: true,
      error: false,
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

export async function sendUserMessageController(request, response) {
  try {
    const userId = request.userId
    const { text, orderId, cardType, cardData } = request.body

    const rawContent = text || request.body.message
    if (!rawContent || !String(rawContent).trim()) {
      return response.status(400).json({ message: 'Message text is required', error: true, success: false })
    }

    const trimmedText = String(rawContent).trim()

    let chat = await SupportChatModel.findOne({ userId })
    const user = await UserModel.findById(userId).select('name email mobile').lean()

    if (!chat) {
      chat = new SupportChatModel({
        userId,
        userName: user?.name || 'Customer',
        userEmail: user?.email || '',
        userMobile: user?.mobile || '',
        messages: [],
      })
    }

    const newMsg = {
      sender: 'user',
      senderName: user?.name || 'Customer',
      text: trimmedText,
      cardType: cardType || '',
      cardData: cardData || {},
      createdAt: new Date(),
    }

    chat.messages.push(newMsg)
    chat.lastMessage = trimmedText
    chat.lastSender = 'user'
    chat.lastMessageAt = new Date()
    chat.unreadCountAdmin = (chat.unreadCountAdmin || 0) + 1
    chat.status = 'OPEN'
    if (orderId) chat.activeOrderId = String(orderId)

    await chat.save()

    // Real-time Socket.IO emission to client chat & admin desk
    const io = request.app?.get('io')
    if (io) {
      io.to(`support_chat_${chat._id}`).emit('new_support_message', {
        chatId: chat._id,
        message: chat.messages[chat.messages.length - 1],
      })
      io.to('admin_support_channel').emit('admin_support_ticket_updated', {
        _id: chat._id,
        chatId: chat._id,
        userId: chat.userId,
        userName: chat.userName,
        userMobile: chat.userMobile,
        userEmail: chat.userEmail,
        lastMessage: trimmedText,
        lastMessageAt: chat.lastMessageAt,
        unreadCountAdmin: chat.unreadCountAdmin,
        status: chat.status,
      })
    }

    // Email notification backup to admin so urgent customer chats are never missed
    if (process.env.SUPPORT_NOTIFY_EMAIL) {
      sendEmail({
        sendTo: process.env.SUPPORT_NOTIFY_EMAIL,
        subject: `💬 Snapit Live Support: ${user?.name || 'Customer'} messaged${chat.activeOrderId ? ` (Order #${chat.activeOrderId})` : ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
            <h2 style="color:#059669;margin-top:0;">New Live Support Message 💬</h2>
            <p><strong>Customer:</strong> ${user?.name || 'Customer'} (${user?.mobile || 'No phone'})</p>
            <p><strong>Email:</strong> ${user?.email || 'N/A'}</p>
            <p><strong>Order ID:</strong> ${chat.activeOrderId || 'General Inquiry'}</p>
            <div style="background:#f8fafc;padding:14px;border-left:4px solid #10b981;border-radius:6px;margin:16px 0;">
              <p style="margin:0;color:#1e293b;font-size:15px;line-height:1.5;">${trimmedText.replace(/\n/g, '<br/>')}</p>
            </div>
            <p style="margin-top:20px;">
              <a href="https://snapit.pages.dev/admin/support-desk" style="display:inline-block;padding:12px 22px;background:#059669;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
                Open Live Support Desk & Reply →
              </a>
            </p>
          </div>
        `,
      }).catch(err => console.warn('[LiveChat Email Alert Error]', err.message))
    }

    return response.json({
      message: 'Message sent successfully',
      data: chat.messages[chat.messages.length - 1],
      chat,
      success: true,
      error: false,
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

export async function getAdminChatsController(request, response) {
  try {
    const { status, search } = request.query

    const filter = {}
    if (status && ['OPEN', 'RESOLVED', 'CLOSED'].includes(status)) {
      filter.status = status
    }

    if (search && search.trim()) {
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { userName: { $regex: q, $options: 'i' } },
        { userMobile: { $regex: q, $options: 'i' } },
        { userEmail: { $regex: q, $options: 'i' } },
        { activeOrderId: { $regex: q, $options: 'i' } },
      ]
    }

    const chats = await SupportChatModel.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean()

    const totalUnread = await SupportChatModel.aggregate([
      { $match: { unreadCountAdmin: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$unreadCountAdmin' } } },
    ])

    return response.json({
      message: 'Admin support chats loaded',
      data: chats,
      totalUnread: totalUnread[0]?.total || 0,
      success: true,
      error: false,
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

export async function getAdminChatByIdController(request, response) {
  try {
    const { id } = request.params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: 'Invalid ticket ID', error: true, success: false })
    }

    const chat = await SupportChatModel.findById(id)

    if (!chat) {
      return response.status(404).json({ message: 'Support ticket not found', error: true, success: false })
    }

    // Reset unread count for admin
    if (chat.unreadCountAdmin > 0) {
      chat.unreadCountAdmin = 0
      await chat.save()

      const io = request.app?.get('io')
      if (io) {
        io.to('admin_support_channel').emit('admin_support_read', { chatId: chat._id })
      }
    }

    return response.json({
      message: 'Ticket details loaded',
      data: chat,
      success: true,
      error: false,
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

export async function sendAdminMessageController(request, response) {
  try {
    const { id } = request.params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: 'Invalid ticket ID', error: true, success: false })
    }

    const { text } = request.body

    if (!text || !text.trim()) {
      return response.status(400).json({ message: 'Message text is required', error: true, success: false })
    }

    const trimmedText = text.trim()
    const chat = await SupportChatModel.findById(id)

    if (!chat) {
      return response.status(404).json({ message: 'Support ticket not found', error: true, success: false })
    }

    const adminUser = request.user
    const adminName = adminUser?.name || 'Snapit Support Desk'

    const newMsg = {
      sender: 'admin',
      senderName: adminName,
      text: trimmedText,
      createdAt: new Date(),
    }

    chat.messages.push(newMsg)
    chat.lastMessage = trimmedText
    chat.lastSender = 'admin'
    chat.lastMessageAt = new Date()
    chat.unreadCountUser = (chat.unreadCountUser || 0) + 1
    // Keep it open while talking
    if (chat.status === 'RESOLVED') {
      chat.status = 'OPEN'
    }

    await chat.save()

    // Real-time socket updates
    const io = request.app?.get('io')
    if (io) {
      io.to(`support_chat_${chat._id}`).emit('new_support_message', {
        _id: chat.messages[chat.messages.length - 1]._id,
        chatId: chat._id,
        message: chat.messages[chat.messages.length - 1],
      })
      io.to(`user_room_${chat.userId}`).emit('customer_support_alert', {
        text: trimmedText,
        sender: adminName,
      })
      io.to('admin_support_channel').emit('admin_support_ticket_updated', {
        _id: chat._id,
        chatId: chat._id,
        userId: chat.userId,
        userName: chat.userName,
        userMobile: chat.userMobile,
        userEmail: chat.userEmail,
        lastMessage: trimmedText,
        lastMessageAt: chat.lastMessageAt,
        unreadCountAdmin: 0,
        status: chat.status,
      })
    }

    return response.json({
      message: 'Admin message sent',
      data: chat.messages[chat.messages.length - 1],
      chat,
      success: true,
      error: false,
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

export async function updateChatStatusController(request, response) {
  try {
    const { id } = request.params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: 'Invalid ticket ID', error: true, success: false })
    }

    const { status } = request.body

    if (!['OPEN', 'RESOLVED', 'CLOSED'].includes(status)) {
      return response.status(400).json({ message: 'Invalid status', error: true, success: false })
    }

    const chat = await SupportChatModel.findById(id)
    if (!chat) {
      return response.status(404).json({ message: 'Support ticket not found', error: true, success: false })
    }

    chat.status = status
    if (status === 'RESOLVED') {
      chat.messages.push({
        sender: 'bot',
        senderName: 'Snapit Assistant',
        text: 'This support ticket has been marked as resolved by our team. Feel free to message here anytime if you need further help!',
        createdAt: new Date(),
      })
      chat.lastMessage = 'Ticket marked as resolved.'
      chat.lastSender = 'bot'
      chat.lastMessageAt = new Date()
    }

    await chat.save()

    const io = request.app?.get('io')
    if (io) {
      if (status === 'RESOLVED') {
        const resolutionMsg = chat.messages[chat.messages.length - 1]
        io.to(`support_chat_${chat._id}`).emit('new_support_message', {
          _id: resolutionMsg._id,
          chatId: chat._id,
          message: resolutionMsg,
        })
      }
      io.to(`support_chat_${chat._id}`).emit('support_chat_status_changed', {
        chatId: chat._id,
        status: chat.status,
        lastMessage: chat.lastMessage,
      })
      io.to('admin_support_channel').emit('admin_support_ticket_updated', {
        _id: chat._id,
        chatId: chat._id,
        status: chat.status,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
      })
    }

    return response.json({
      message: `Ticket status updated to ${status}`,
      data: chat,
      success: true,
      error: false,
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}
