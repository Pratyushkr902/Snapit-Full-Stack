import mongoose from 'mongoose'
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
import { normalizeEmail, isDisposableEmail } from '../utils/emailNormalize.js'

const cookiesOption = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/"
}

export async function getAllAmbassadorsController(request, response) {
    try {
        const ambassadors = await UserModel.find({ role: 'CAMPUS_AMBASSADOR' })
            .select('name email campusAmbassador createdAt')
            .sort({ 'campusAmbassador.performance.points': -1, createdAt: -1 })

        return response.json({
            message: "Campus Ambassadors fetched successfully",
            error: false,
            success: true,
            data: ambassadors
        })
    } catch (error) {
        console.error("getAllAmbassadorsController:", error.message)
        return response.status(500).json({
            message: error.message || "Failed to fetch Campus Ambassadors",
            error: true,
            success: false
        })
    }
}

export async function createCampusAmbassadorController(request, response) {
    try {
        const {
            name, email, password,
            college, course, year, campus, instagram
        } = request.body

        if (!name || !email || !password || !college) {
            return response.status(400).json({
                message: "provide name, email, password, college",
                error: true,
                success: false
            })
        }

        const existing = await UserModel.findOne({ email })
        if (existing) {
            return response.status(400).json({
                message: "Email already registered",
                error: true,
                success: false
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(password, salt)

        const newUser = new UserModel({
            name,
            email,
            password: hashPassword,
            role: 'CAMPUS_AMBASSADOR',
            campusAmbassador: {
                college,
                course: course || '',
                year: year || '',
                campus: campus || '',
                status: 'active',
                social: { instagram: instagram || '' }
            }
        })

        await newUser.save()

        const safeUser = newUser.toObject()
        delete safeUser.password

        return response.status(201).json({
            message: "Campus Ambassador created successfully",
            error: false,
            success: true,
            data: safeUser
        })
    } catch (error) {
        console.error("createCampusAmbassadorController:", error.message)
        return response.status(500).json({
            message: error.message || "Failed to create Campus Ambassador",
            error: true,
            success: false
        })
    }
}

export async function registerUserController(request, response) {
    try {
        const { name, email, password, referralCode: incomingReferralCode } = request.body

        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !name.trim() ||
            !email.trim() ||
            !password.trim()
        ) {
            return response.status(400).json({
                message: "Please provide a valid name, email, and password.",
                error: true,
                success: false
            })
        }

        const safeEmail = email.trim().toLowerCase()
        if (isDisposableEmail(safeEmail)) {
            return response.status(400).json({
                message: "Temporary/disposable email addresses are not allowed. Please use a valid personal email.",
                error: true,
                success: false
            })
        }

        const cleanEmail = normalizeEmail(safeEmail)

        const user = await UserModel.findOne({
            $or: [{ email: cleanEmail }, { email: safeEmail }]
        })

        if (user) {
            return response.json({
                message: "Already register email",
                error: true,
                success: false
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(password, salt)

        const newReferralCode = name.toUpperCase().replace(/\s/g, '').slice(0, 4) +
            Math.floor(1000 + Math.random() * 9000);

        const payload = {
            name: name.trim(),
            email: cleanEmail,
            password: hashPassword,
            referralCode: newReferralCode
        }

        // Check if incomingReferralCode matches a Campus Ambassador's code
        // (separate namespace from the general referralCode system below).
        const safeAmbCode = typeof incomingReferralCode === 'string' ? incomingReferralCode.trim().toUpperCase() : ''
        const ambassadorReferrer = safeAmbCode
            ? await UserModel.findOne({
                role: 'CAMPUS_AMBASSADOR',
                'campusAmbassador.referralCode': safeAmbCode
              })
            : null
        if (ambassadorReferrer && normalizeEmail(ambassadorReferrer.email) !== cleanEmail) {
            payload.referredByAmbassador = ambassadorReferrer._id
            await UserModel.updateOne(
                { _id: ambassadorReferrer._id },
                { $inc: {
                    'campusAmbassador.referralStats.signUps': 1,
                    'campusAmbassador.performance.points': 5
                } }
            )
        }

        if (safeAmbCode) {
            const referrer = await UserModel.findOne({
                referralCode: safeAmbCode
            })

            // Prevent self-referral (cannot refer yourself using alias/dot tricks)
            if (referrer && normalizeEmail(referrer.email) !== cleanEmail) {
                payload.referredBy = safeAmbCode
            }
        }

        const newUser = new UserModel(payload)
        const save = await newUser.save()

        const VerifyEmailUrl = `${process.env.FRONTEND_URL}/#/verify-email?code=${save?._id}`

        await sendEmail({
            sendTo: safeEmail,
            subject: "Verify email from Snapit",
            html: verifyEmailTemplate({
                name,
                url: VerifyEmailUrl
            })
        })

        return response.json({
            message: "User register successfully. Please verify your email.",
            error: false,
            success: true,
            data: {
                _id: save._id,
                name: save.name,
                email: save.email,
                verify_email: save.verify_email
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

export async function verifyEmailController(request, response) {
    try {
        const { code } = request.body
        if (typeof code !== 'string' || !code.trim() || !mongoose.Types.ObjectId.isValid(code.trim())) {
            return response.status(400).json({
                message: "Invalid verification code",
                error: true,
                success: false
            })
        }
        const user = await UserModel.findOne({ _id: code.trim() })
        if (!user) {
            return response.status(400).json({
                message: "Invalid code",
                error: true,
                success: false
            })
        }
        await UserModel.updateOne({ _id: code.trim() }, { verify_email: true })

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

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password.trim()
        ) {
            return response.status(400).json({
                message: "Please provide a valid email and password.",
                error: true,
                success: false
            })
        }

        const safeEmail = email.trim().toLowerCase()
        const cleanEmail = normalizeEmail(safeEmail)
        const user = await UserModel.findOne({
            $or: [{ email: cleanEmail }, { email: safeEmail }]
        })

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

        if (!user.password) {
            return response.status(400).json({
                message: "This account was created via OTP login. Please log in with OTP instead of a password.",
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

        const accesstoken = await generatedAccessToken(user._id, user.role)
        const refreshToken = await genertedRefreshToken(user._id)

        await UserModel.findByIdAndUpdate(user._id, {
            refresh_token: refreshToken,
            last_login_date: new Date()
        })

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

        response.clearCookie("accessToken", cookiesOption)
        response.clearCookie("refreshToken", cookiesOption)

        // FIX: also clear fcmToken on logout. Previously a device's FCM token
        // stayed on the account forever once saved — if the same physical device
        // was ever used to log into a different role (e.g. testing the Rider
        // Dashboard from an admin's phone), that device's token would silently
        // keep receiving that role's push notifications indefinitely, even after
        // switching back to a different account on the same device.
        await UserModel.findByIdAndUpdate(userid, { refresh_token: "", fcmToken: "" })

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
        if (typeof email !== 'string' || !email.trim()) {
            return response.status(400).json({
                message: "Please provide a valid email address.",
                error: true,
                success: false
            })
        }

        const safeEmail = email.trim().toLowerCase()
        const user = await UserModel.findOne({ email: safeEmail })

        if (!user) {
            return response.status(400).json({
                message: "Email not available",
                error: true,
                success: false
            })
        }

        const rawOtp = generatedOtp()
        const stringOtp = String(rawOtp).trim()

        const expireTime = new Date(Date.now() + 60 * 60 * 1000);

        await UserModel.findByIdAndUpdate(user._id, {
            forgot_password_otp: stringOtp,
            forgot_password_expiry: expireTime
        })

        try {
            await sendEmail({
                sendTo: safeEmail,
                subject: "Forgot password from Snapit",
                html: forgotPasswordTemplate({ name: user.name, otp: stringOtp })
            })
        } catch (emailError) {
            console.error("🚨 Core Email Transport System Fail:", emailError.message);
            return response.status(500).json({
                message: "Failed to transmit OTP notification out to your mail delivery cluster. Check SMTP configurations.",
                error: true,
                success: false
            });
        }

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

        if (
            typeof email !== 'string' ||
            typeof otp === 'undefined' ||
            !email.trim() ||
            !String(otp).trim()
        ) {
            return response.status(400).json({
                message: "Provide required fields email and otp.",
                error: true,
                success: false
            })
        }

        const safeEmail = email.trim().toLowerCase()
        const user = await UserModel.findOne({ email: safeEmail })

        if (!user) {
            return response.status(400).json({
                message: "Email not available",
                error: true,
                success: false
            })
        }

        const currentTime = new Date()
        const expiryTime = new Date(user.forgot_password_expiry)

        if (expiryTime < currentTime) {
            return response.status(400).json({
                message: "Otp is expired",
                error: true,
                success: false
            })
        }

        if (String(otp).trim() !== String(user.forgot_password_otp).trim()) {
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

        if (
            typeof email !== 'string' ||
            typeof newPassword !== 'string' ||
            typeof confirmPassword !== 'string' ||
            !email.trim() ||
            !newPassword.trim() ||
            !confirmPassword.trim()
        ) {
            return response.status(400).json({
                message: "provide valid required fields email, newPassword, confirmPassword",
                error: true,
                success: false
            })
        }

        const safeEmail = email.trim().toLowerCase()
        const user = await UserModel.findOne({ email: safeEmail })

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

        const userId = verifyToken?.id

        const user = await UserModel.findById(userId)
        if (!user) {
            return response.status(401).json({
                message: "User not found",
                error: true,
                success: false
            })
        }

        const newAccessToken = await generatedAccessToken(userId, user.role)

        response.cookie('accessToken', newAccessToken, cookiesOption)

        return response.json({
            message: "New Access token generated",
            error: false,
            success: true,
            data: {
                accesstoken: newAccessToken
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

export async function userDetails(request, response) {
    try {
        const userId = request.userId
        const user = await UserModel.findById(userId).select('-password -refresh_token').lean()
        if (user.isSnapitPlusMember === undefined) user.isSnapitPlusMember = false
        if (user.snapitPlusExpiresAt === undefined) user.snapitPlusExpiresAt = null

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

export async function getAllRiders(request, response) {
    try {
        // FIX: role is stored as 'RIDER' (uppercase) — this was querying lowercase
        // 'rider' and matching nothing, so the admin rider list was always empty.
        const riders = await UserModel.find({ role: 'RIDER' }).select('name email mobile status')
        return response.json({
            message: "Riders fetched",
            error: false,
            success: true,
            data: riders
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function saveFcmTokenController(request, response) {
    try {
        const userId = request.userId
        const { fcmToken } = request.body

        if (!fcmToken) {
            return response.status(400).json({
                message: "FCM token is required",
                error: true,
                success: false
            })
        }

        // Save active token and add to user's device token pool
        await UserModel.findByIdAndUpdate(userId, {
            fcmToken,
            $addToSet: { fcmTokens: fcmToken }
        })

        return response.json({
            message: "FCM token saved successfully",
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

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE DOB (needed for Birthday Bonus)
// ─────────────────────────────────────────────────────────────────────────────
export const updateDobController = async (request, response) => {
    try {
        const userId = request.userId
        const { dob } = request.body

        if (!dob) {
            return response.status(400).json({ message: 'dob is required.', error: true, success: false })
        }

        const parsedDob = new Date(dob)
        if (isNaN(parsedDob.getTime())) {
            return response.status(400).json({ message: 'Invalid date format.', error: true, success: false })
        }

        if (parsedDob > new Date()) {
            return response.status(400).json({ message: 'Date of birth cannot be in the future.', error: true, success: false })
        }

        await UserModel.findByIdAndUpdate(userId, { dob: parsedDob })

        return response.json({
            message: 'Birthday saved.',
            error: false,
            success: true,
            data: { dob: parsedDob }
        })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST PUSH NOTIFICATION (Dispatches to all active devices of the caller)
// ─────────────────────────────────────────────────────────────────────────────
export const testPushNotificationController = async (request, response) => {
    try {
        const userId = request.userId
        const user = await UserModel.findById(userId).select('name email role fcmToken fcmTokens').lean()
        if (!user) {
            return response.status(404).json({ message: 'User not found.', error: true, success: false })
        }

        const allTokens = [
            ...(user.fcmToken ? [user.fcmToken] : []),
            ...(Array.isArray(user.fcmTokens) ? user.fcmTokens : [])
        ].filter(t => typeof t === 'string' && t.trim().length > 10)

        const uniqueTokens = [...new Set(allTokens)]

        if (uniqueTokens.length === 0) {
            return response.status(400).json({
                message: 'No push notification token registered for this device yet. Please enable notification permissions and reopen the app.',
                error: true,
                success: false
            })
        }

        const { sendPushNotification } = await import('../utils/firebaseNotify.js')
        const results = await Promise.allSettled(
            uniqueTokens.map(token =>
                sendPushNotification({
                    token,
                    title: '⚡ Snapit Live Test Alert',
                    body: `Hello ${user.name || 'there'}! Push notifications are active on this device. 🚀`,
                    data: { type: 'TEST', timestamp: String(Date.now()) }
                })
            )
        )

        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length

        return response.json({
            message: `Test push sent to ${uniqueTokens.length} device(s) (${successful} accepted).`,
            error: false,
            success: true,
            devicesCount: uniqueTokens.length
        })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}