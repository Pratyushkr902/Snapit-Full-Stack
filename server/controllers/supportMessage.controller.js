import SupportMessage from '../models/supportMessage.model.js'
import sendEmail from './sendEmail.js'

export const createSupportMessage = async (req, res) => {
  try {
    const { name, phone, orderId, message } = req.body
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required', success: false })
    }

    const doc = await SupportMessage.create({
      userId: req.userId || null,
      name: name || 'Guest',
      phone: phone || '',
      orderId: orderId || '',
      message: message.trim(),
    })

    sendEmail({
      sendTo: process.env.SUPPORT_NOTIFY_EMAIL,
      subject: `New Snapit support message${orderId ? ` — Order ${orderId}` : ''}`,
      html: `
        <p><strong>From:</strong> ${name || 'Guest'} (${phone || 'no phone'})</p>
        <p><strong>Order:</strong> ${orderId || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `,
    }).catch(err => console.error('Support email notify failed:', err.message))

    return res.status(201).json({ message: 'Message received', success: true, data: doc })
  } catch (err) {
    return res.status(500).json({ message: err.message, success: false })
  }
}

export const getSupportMessages = async (req, res) => {
  try {
    const messages = await SupportMessage.find().sort({ createdAt: -1 }).limit(100)
    return res.json({ success: true, data: messages })
  } catch (err) {
    return res.status(500).json({ message: err.message, success: false })
  }
}
