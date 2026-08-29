import bcryptjs from 'bcryptjs'
import UserModel from '../models/user.model.js'
import OtpModel from '../models/otp.model.js'
import generatedOtp from '../utils/generatedOtp.js'
import generatedAccessToken from '../utils/generatedAccessToken.js'
import genertedRefreshToken from '../utils/generatedRefreshToken.js'
import sendEmailResend from './sendEmailResend.js'
import { normalizeEmail, isDisposableEmail } from '../utils/emailNormalize.js'

const cookiesOption = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/"
}

const OTP_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS = 5

// POST /api/otp/send  — body: { email }
// Sends a 6-digit OTP to the given email. Works for both new signups and
// existing-account logins — the frontend doesn't need to know which case
// it is; verify-otp figures that out.
export async function sendOtpController(request, response) {
    try {
        const { email } = request.body

        if (!email) {
            return response.status(400).json({ message: 'Email is required', error: true, success: false })
        }

        if (isDisposableEmail(email)) {
            return response.status(400).json({
                message: 'Temporary/disposable emails are not allowed.',
                error: true,
                success: false
            })
        }

        const cleanEmail = normalizeEmail(email)

        const otp = generatedOtp()
        const otpHash = await bcryptjs.hash(String(otp), 10)
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

        // Remove any previous unverified OTPs for this email so old codes can't
        // linger and be reused/guessed.
        await OtpModel.deleteMany({ email, verified: false })

        await OtpModel.create({ email, otpHash, purpose: 'login', expiresAt })

        const emailResult = await sendEmailResend({
            sendTo: email,
            subject: 'Your Snapit login code',
            html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #f97316;">Your Snapit login code</h2>
                    <p>Use this code to log in. It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
                    <p style="font-size: 32px; font-weight: 800; letter-spacing: 6px;">${otp}</p>
                    <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `,
        })

        if (!emailResult) {
            return response.status(500).json({ message: 'Failed to send OTP email. Please try again.', error: true, success: false })
        }

        return response.json({ message: 'OTP sent', error: false, success: true })
    } catch (error) {
        console.error('[otp.controller]', error.message)
        return response.status(500).json({ message: 'Something went wrong. Please try again.', error: true, success: false })
    }
}

// POST /api/otp/verify — body: { email, otp, name? }
// If a user with this email already exists → logs them in.
// If not → creates a new account (name required in this case) and logs them in.
export async function verifyOtpController(request, response) {
    try {
        const { email, otp, name } = request.body
        if (!email || !otp) {
            return response.status(400).json({ message: 'Email and OTP are required', error: true, success: false })
        }

        const cleanEmail = normalizeEmail(email)

        const otpRecord = await OtpModel.findOne({
            $or: [{ email: cleanEmail }, { email: email.trim().toLowerCase() }],
            verified: false
        }).sort({ createdAt: -1 })

        if (!otpRecord) {
            return response.status(400).json({ message: 'OTP expired or not found. Please request a new one.', error: true, success: false })
        }

        if (otpRecord.attempts >= MAX_ATTEMPTS) {
            return response.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.', error: true, success: false })
        }

        const isValid = await bcryptjs.compare(String(otp), otpRecord.otpHash)
        if (!isValid) {
            otpRecord.attempts += 1
            await otpRecord.save()
            return response.status(400).json({ message: 'Invalid OTP', error: true, success: false })
        }

        otpRecord.verified = true
        await otpRecord.save()

        let user = await UserModel.findOne({
            $or: [{ email: cleanEmail }, { email: email.trim().toLowerCase() }]
        })

        if (!user) {
            // New account via OTP — seamless signup with name or email fallback
            const displayName = (name && name.trim()) ? name.trim() : (email.split('@')[0] || 'Snapit User')
            const cleanPrefix = displayName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'SNAP'
            const newReferralCode = cleanPrefix + Math.floor(1000 + Math.random() * 9000)

            // Capture who referred this user, if a referral code was supplied.
            // Ensure no self-referrals via alias/dot tricks
            const incomingReferralCode = (request.body.referralCode || '').trim().toUpperCase()
            let referredByCode = null
            if (incomingReferralCode) {
                const referrer = await UserModel.findOne({ referralCode: incomingReferralCode }).select('email')
                if (referrer && normalizeEmail(referrer.email) !== cleanEmail) {
                    referredByCode = incomingReferralCode
                }
            }

            user = await UserModel.create({
                name: displayName,
                email: cleanEmail,
                referralCode: newReferralCode,
                referredBy: referredByCode,
                status: 'Active',
            })
        }

        if (user.status !== 'Active') {
            return response.status(400).json({ message: 'Contact to Admin', error: true, success: false })
        }

        const accesstoken = await generatedAccessToken(user._id, user.role)
        const refreshToken = await genertedRefreshToken(user._id)

        await UserModel.findByIdAndUpdate(user._id, {
            refresh_token: refreshToken,
            last_login_date: new Date(),
        })

        response.cookie('accessToken', accesstoken, cookiesOption)
        response.cookie('refreshToken', refreshToken, cookiesOption)

        return response.json({
            message: 'Login successful',
            error: false,
            success: true,
            data: { accesstoken, refreshToken },
        })
    } catch (error) {
        console.error('[otp.controller]', error.message)
        return response.status(500).json({ message: 'Something went wrong. Please try again.', error: true, success: false })
    }
}
