import sendEmail from './sendEmail.js'
import UserModel from '../models/user.model.js'
import bcryptjs from 'bcryptjs'
import verifyEmailTemplate from '../utils/verifyEmailTemplate.js'
import generatedAccessToken from '../utils/generatedAccessToken.js'
import genertedRefreshToken from '../utils/generatedRefreshToken.js'
import uploadImageClodinary from '../utils/uploadImageClodinary.js'
import generatedOtp from '../utils/generatedOtp.js'
import forgotPasswordTemplate from '../utils/forgotPasswordTemplate.js'
import jwt from 'jsonwebtoken'

export async function registerUserController(request, response) {
    try {
        const { name, email, password, referralCode: incomingReferralCode } = request.body

        if (!name || !email || !password) {
            return response.status(400).json({
                message: "provide email, name, password",
                error: true,
                success: false
            })
        }

        const user = await UserModel.findOne({ email })

        if (user) {
            return response.json({
                message: "Already register email",
                error: true,
                success: false
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(password, salt)

        // --- SNAPIT REFERRAL CODE GENERATION ---
        // Generates a code like PRAT8429
        const newReferralCode = name.toUpperCase().replace(/\s/g, '').slice(0, 4) + 
                               Math.floor(1000 + Math.random() * 9000);

        const payload = {
            name,
            email,
            password: hashPassword,
            referralCode: newReferralCode
        }

        // --- APPLY REFERRAL REWARD LOGIC ---
        if (incomingReferralCode) {
            const referrer = await UserModel.findOne({ 
                referralCode: incomingReferralCode 
            })
            
            if (referrer) {
                // Give referrer ₹20 reward instantly
                referrer.walletBalance += 20
                referrer.referralCount += 1
                referrer.walletTransactions.push({
                    type: 'credit',
                    amount: 20,
                    description: `Referral bonus - ${name} joined using your code!`,
                    date: new Date()
                })
                await referrer.save()

                // Mark the new user as referred
                payload.referredBy = incomingReferralCode
                
                // Optional: Give new user a welcome bonus
                payload.walletBalance = 10 
                payload.walletTransactions = [{
                    type: 'credit',
                    amount: 10,
                    description: "Welcome bonus for using a referral code!",
                    date: new Date()
                }]
            }
        }

        const newUser = new UserModel(payload)
        const save = await newUser.save()

        const VerifyEmailUrl = `${process.env.FRONTEND_URL}/verify-email?code=${save?._id}`

        await sendEmail({
            sendTo: email,
            subject: "Verify email from Snapit",
            html: verifyEmailTemplate({
                name,
                url: VerifyEmailUrl
            })
        })

        return response.json({
            message: "User register successfully",
            error: false,
            success: true,
            data: save
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function verifyEmailController(request, response) {
    try {
        const { code } = request.body
        const user = await UserModel.findOne({ _id: code })

        if (!user) {
            return response.status(400).json({
                message: "Invalid code",
                error: true,
                success: false
            })
        }

        await UserModel.updateOne({ _id: code }, { verify_email: true })

        return response.json({
            message: "Verify email done",
            success: true,
            error: false
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function loginController(request, response) {
    try {
        const { email, password } = request.body

        if (!email || !password) {
            return response.status(400).json({
                message: "provide email, password",
                error: true,
                success: false
            })
        }

        const user = await UserModel.findOne({ email })

        if (!user) {
            return response.status(400).json({
                message: "User not register",
                error: true,
                success: false
            })
        }

        if (user.status !== "Active") {
            return response.status(400).json({
                message: "Contact to Admin",
                error: true,
                success: false
            })
        }

        const checkPassword = await bcryptjs.compare(password, user.password)

        if (!checkPassword) {
            return response.status(400).json({
                message: "Check your password",
                error: true,
                success: false
            })
        }

        const accesstoken = await generatedAccessToken(user._id)
        const refreshToken = await genertedRefreshToken(user._id)

        await UserModel.findByIdAndUpdate(user._id, {
            refresh_token: refreshToken,
            last_login_date: new Date()
        })

        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }
        response.cookie('accessToken', accesstoken, cookiesOption)
        response.cookie('refreshToken', refreshToken, cookiesOption)

        return response.json({
            message: "Login successfully",
            error: false,
            success: true,
            data: {
                accesstoken,
                refreshToken
            }
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function logoutController(request, response) {
    try {
        const userid = request.userId
        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }

        response.clearCookie("accessToken", cookiesOption)
        response.clearCookie("refreshToken", cookiesOption)

        await UserModel.findByIdAndUpdate(userid, { refresh_token: "" })

        return response.json({
            message: "Logout successfully",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function uploadAvatar(request, response) {
    try {
        const userId = request.userId
        const image = request.file
        const upload = await uploadImageClodinary(image)

        await UserModel.findByIdAndUpdate(userId, { avatar: upload.url })

        return response.json({
            message: "upload profile",
            success: true,
            error: false,
            data: { _id: userId, avatar: upload.url }
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function updateUserDetails(request, response) {
    try {
        const userId = request.userId
        const { name, email, mobile, password } = request.body

        let hashPassword = ""
        if (password) {
            const salt = await bcryptjs.genSalt(10)
            hashPassword = await bcryptjs.hash(password, salt)
        }

        const updateData = {
            ...(name && { name }),
            ...(email && { email }),
            ...(mobile && { mobile }),
            ...(password && { password: hashPassword })
        }

        const updateUser = await UserModel.findByIdAndUpdate(userId, updateData, { new: true })

        return response.json({
            message: "Updated successfully",
            error: false,
            success: true,
            data: updateUser
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function forgotPasswordController(request, response) {
    try {
        const { email } = request.body
        const user = await UserModel.findOne({ email })

        if (!user) {
            return response.status(400).json({
                message: "Email not available",
                error: true,
                success: false
            })
        }

        const otp = generatedOtp()
        const expireTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

        await UserModel.findByIdAndUpdate(user._id, {
            forgot_password_otp: otp,
            forgot_password_expiry: expireTime
        })

        await sendEmail({
            sendTo: email,
            subject: "Forgot password from Snapit",
            html: forgotPasswordTemplate({ name: user.name, otp })
        })

        return response.json({
            message: "check your email",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function verifyForgotPasswordOtp(request, response) {
    try {
        const { email, otp } = request.body

        if (!email || !otp) {
            return response.status(400).json({
                message: "Provide required field email, otp.",
                error: true,
                success: false
            })
        }

        const user = await UserModel.findOne({ email })

        if (!user) {
            return response.status(400).json({
                message: "Email not available",
                error: true,
                success: false
            })
        }

        const currentTime = new Date().toISOString()

        if (user.forgot_password_expiry < currentTime) {
            return response.status(400).json({
                message: "Otp is expired",
                error: true,
                success: false
            })
        }

        if (otp !== user.forgot_password_otp) {
            return response.status(400).json({
                message: "Invalid otp",
                error: true,
                success: false
            })
        }

        await UserModel.findByIdAndUpdate(user._id, {
            forgot_password_otp: "",
            forgot_password_expiry: ""
        })

        return response.json({
            message: "Verify otp successfully",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function resetpassword(request, response) {
    try {
        const { email, newPassword, confirmPassword } = request.body

        if (!email || !newPassword || !confirmPassword) {
            return response.status(400).json({
                message: "provide required fields email, newPassword, confirmPassword"
            })
        }

        const user = await UserModel.findOne({ email })

        if (!user) {
            return response.status(400).json({
                message: "Email is not available",
                error: true,
                success: false
            })
        }

        if (newPassword !== confirmPassword) {
            return response.status(400).json({
                message: "newPassword and confirmPassword must be same.",
                error: true,
                success: false,
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(newPassword, salt)

        await UserModel.findByIdAndUpdate(user._id, { password: hashPassword })

        return response.json({
            message: "Password updated successfully.",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function refreshToken(request, response) {
    try {
        const refreshToken = request.cookies.refreshToken || request?.headers?.authorization?.split(" ")[1]

        if (!refreshToken) {
            return response.status(401).json({
                message: "Invalid token",
                error: true,
                success: false
            })
        }

        let verifyToken;
        try {
            verifyToken = jwt.verify(refreshToken, process.env.SECRET_KEY_REFRESH_TOKEN);
        } catch (err) {
            return response.status(401).json({
                message: "token is expired or invalid",
                error: true,
                success: false
            });
        }

        const userId = verifyToken?._id
        const newAccessToken = await generatedAccessToken(userId)

        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }
        response.cookie('accessToken', newAccessToken, cookiesOption)

        return response.json({
            message: "New Access token generated",
            error: false,
            success: true,
            data: { accessToken: newAccessToken }
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function userDetails(request, response) {
    try {
        const userId = request.userId
        const user = await UserModel.findById(userId).select('-password -refresh_token')

        return response.json({
            message: 'user details',
            data: user,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: "Something is wrong",
            error: true,
            success: false
        })
    }
}