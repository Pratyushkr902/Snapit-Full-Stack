import { Router } from 'express'
import { sendOtpController, verifyOtpController } from '../controllers/otp.controller.js'

const otpRouter = Router()

otpRouter.post('/send', sendOtpController)
otpRouter.post('/verify', verifyOtpController)

export default otpRouter
