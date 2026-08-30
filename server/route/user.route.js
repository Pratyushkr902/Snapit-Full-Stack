import { Router } from 'express'
import {
    forgotPasswordController,
    loginController,
    logoutController,
    refreshToken,
    registerUserController,
    createCampusAmbassadorController,
    getAllAmbassadorsController,
    resetpassword,
    updateUserDetails,
    uploadAvatar,
    userDetails,
    verifyEmailController,
    verifyForgotPasswordOtp,
    getAllRiders,
    saveFcmTokenController,
    updateDobController,
    testPushNotificationController
} from '../controllers/user.controller.js'
import auth, { optionalAuth } from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'        // ✅ added
import upload from '../middleware/multer.js'
import { authLimiter, otpLimiter } from '../middleware/security.js'
import { validateRegister, validateLogin, validateForgotPassword } from '../middleware/validators.js'

const userRouter = Router()

// ── Rate-limited public auth routes ──────────────────────────
userRouter.post('/register',                   authLimiter, validateRegister, registerUserController)
userRouter.post('/login',                      authLimiter, validateLogin, loginController)
userRouter.post('/forgot-password',            otpLimiter, validateForgotPassword, forgotPasswordController)
userRouter.put('/forgot-password',             otpLimiter, validateForgotPassword, forgotPasswordController)
userRouter.put('/verify-forgot-password-otp',  otpLimiter, verifyForgotPasswordOtp)
userRouter.post('/verify-forgot-password-otp', otpLimiter, verifyForgotPasswordOtp)

// ── Standard public routes ────────────────────────────────────
userRouter.post('/verify-email',               verifyEmailController)
userRouter.put('/reset-password',             resetpassword)
userRouter.post('/reset-password',            resetpassword)
userRouter.post('/refresh-token',             refreshToken)

// ── Anonymous / Authenticated token registration ──────────────
userRouter.post('/save-fcm-token',            optionalAuth, saveFcmTokenController)

// ── Authenticated routes ─────────────────────────────────────
userRouter.get('/logout',                     auth, logoutController)
userRouter.put('/upload-avatar',              auth, upload.single('avatar'), uploadAvatar)
userRouter.put('/update-user',                auth, updateUserDetails)
userRouter.get('/user-details',               auth, userDetails)
userRouter.post('/test-push-notification',     auth, testPushNotificationController)
userRouter.put('/update-dob',                 auth, updateDobController)

// ── Admin only ───────────────────────────────────────────────
userRouter.get('/all-riders',                 auth, admin, getAllRiders)  // ✅ added admin guard
userRouter.post('/create-ambassador',         auth, admin, createCampusAmbassadorController)
userRouter.get('/all-ambassadors',            auth, admin, getAllAmbassadorsController)

export default userRouter