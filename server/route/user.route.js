import { Router } from 'express'
import {
    forgotPasswordController,
    loginController,
    logoutController,
    refreshToken,
    registerUserController,
    resetpassword,
    updateUserDetails,
    uploadAvatar,
    userDetails,
    verifyEmailController,
    verifyForgotPasswordOtp,
    getAllRiders,
    saveFcmTokenController
} from '../controllers/user.controller.js'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'        // ✅ added
import upload from '../middleware/multer.js'
import { authLimiter, otpLimiter } from '../middleware/security.js'
import { validateRegister, validateLogin, validateForgotPassword } from '../middleware/validators.js'

const userRouter = Router()

// ── Public routes ────────────────────────────────────────────
userRouter.post('/register',                  authLimiter, validateRegister, registerUserController)
userRouter.post('/verify-email',              verifyEmailController)
userRouter.post('/login',                     authLimiter, validateLogin, loginController)
userRouter.put('/forgot-password',            otpLimiter, validateForgotPassword, forgotPasswordController)
userRouter.put('/verify-forgot-password-otp', verifyForgotPasswordOtp)
userRouter.put('/reset-password',             resetpassword)
userRouter.post('/refresh-token',             refreshToken)

// ── Authenticated routes ─────────────────────────────────────
userRouter.get('/logout',                     auth, logoutController)
userRouter.put('/upload-avatar',              auth, upload.single('avatar'), uploadAvatar)
userRouter.put('/update-user',                auth, updateUserDetails)
userRouter.get('/user-details',               auth, userDetails)
userRouter.post('/save-fcm-token',            auth, saveFcmTokenController)

// ── Admin only ───────────────────────────────────────────────
userRouter.get('/all-riders',                 auth, admin, getAllRiders)  // ✅ added admin guard

export default userRouter