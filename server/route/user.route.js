cat << 'EOF' > server/route/user.route.js
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
import upload from '../middleware/multer.js'

const userRouter = Router()

userRouter.post('/register', registerUserController)
userRouter.post('/verify-email', verifyEmailController)
userRouter.post('/login', loginController)
userRouter.get('/logout', auth, logoutController)
userRouter.put('/upload-avatar', auth, upload.single('avatar'), uploadAvatar)
userRouter.put('/update-user', auth, updateUserDetails)
userRouter.put('/forgot-password', forgotPasswordController)
userRouter.put('/verify-forgot-password-otp', verifyForgotPasswordOtp)
userRouter.put('/reset-password', resetpassword)
userRouter.post('/refresh-token', refreshToken)
userRouter.get('/user-details', auth, userDetails)
userRouter.get('/all-riders', auth, getAllRiders)
userRouter.post('/save-fcm-token', auth, saveFcmTokenController)

export default userRouter
EOF