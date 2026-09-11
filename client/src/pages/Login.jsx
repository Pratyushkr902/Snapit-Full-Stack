import React, { useState, useRef, useEffect } from 'react'
import { FaArrowLeft, FaWhatsapp } from "react-icons/fa6"
import { MdEmail, MdPerson, MdPhoneAndroid } from "react-icons/md"
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setUserDetails } from '../store/userSlice'
import fetchUserDetails from '../utils/fetchUserDetails'
import secureStorage from '../utils/secureStorage'
import snapitLogo from '/logo.png'
import { auth } from '../utils/firebase'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'

const Login = () => {
    const [searchParams] = useSearchParams()
    const refCode = searchParams.get('ref') || ''

    // 'mobile_otp' (default) or 'email_otp'
    const [authMode, setAuthMode] = useState('mobile_otp')

    // ── Mobile OTP state (Firebase Phone Auth) ──
    const [firebaseStep, setFirebaseStep] = useState('input') // 'input' or 'verify'
    const [custName, setCustName] = useState('')
    const [custMobile, setCustMobile] = useState('')
    const [firebaseOtp, setFirebaseOtp] = useState(['', '', '', '', '', ''])
    const [confirmationResult, setConfirmationResult] = useState(null)
    const firebaseOtpRefs = useRef([])
    const recaptchaVerifierRef = useRef(null)

    // ── Email OTP state ──
    const [step, setStep] = useState('input') // 'input' or 'verify'
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [loading, setLoading] = useState(false)
    const [countdown, setCountdown] = useState(0)

    const otpInputRefs = useRef([])
    const dispatch = useDispatch()
    const navigate = useNavigate()

    // Auto-clear stale tokens and dismiss lingering toasts on mount
    useEffect(() => {
        secureStorage.removeItem('accessToken')
        secureStorage.removeItem('refreshToken')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        toast.dismiss()
    }, [])

    // Auto-dismiss toasts when switching mode or step
    useEffect(() => {
        toast.dismiss()
    }, [authMode, step, firebaseStep])

    // Countdown timer for Resend OTP
    useEffect(() => {
        let timer
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000)
        }
        return () => clearInterval(timer)
    }, [countdown])

    // Auto-focus first Email OTP input
    useEffect(() => {
        if (step === 'verify' && otpInputRefs.current[0]) {
            otpInputRefs.current[0].focus()
        }
    }, [step])

    // Auto-focus first Phone OTP input
    useEffect(() => {
        if (firebaseStep === 'verify' && firebaseOtpRefs.current[0]) {
            firebaseOtpRefs.current[0].focus()
        }
    }, [firebaseStep])

    // Save tokens and update redux
    const handleLoginSuccess = async (token, refresh) => {
        try {
            if (token) await secureStorage.setItem('accessToken', token)
            if (refresh) await secureStorage.setItem('refreshToken', refresh)
        } catch (e) {
            console.warn('Storage setItem warning:', e)
        }

        try {
            const userDetails = await fetchUserDetails()
            if (userDetails?.success && userDetails.data) {
                dispatch(setUserDetails(userDetails.data))
            }
        } catch (e) {
            console.warn('Initial userDetails fetch warning:', e)
        }

        const redirectPath = searchParams.get('redirect') || '/'
        navigate(redirectPath, { replace: true })
    }

    // ── 1. FIREBASE PHONE OTP: SEND SMS ──
    const handleSendFirebaseOtp = async (e) => {
        e?.preventDefault()
        toast.dismiss()
        const clean = custMobile.replace(/\D/g, '')
        if (clean.length !== 10) {
            toast.error('Please enter a valid 10-digit mobile number')
            return
        }

        if (!auth) {
            toast.error('Authentication service is initializing. Please try again or switch to Email OTP.')
            return
        }

        try {
            setLoading(true)
            toast.loading('Sending verification code...', { id: 'firebase-otp' })

            // Clean up any existing verifier and clear DOM container
            if (recaptchaVerifierRef.current) {
                try { recaptchaVerifierRef.current.clear() } catch {}
                recaptchaVerifierRef.current = null
            }
            const container = document.getElementById('recaptcha-container')
            if (container) container.innerHTML = ''

            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => {},
                'expired-callback': () => {
                    toast.error('Verification expired. Please request a new code.')
                }
            })
            await recaptchaVerifierRef.current.render()

            const formattedPhone = `+91${clean}`
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current)
            setConfirmationResult(confirmation)
            setFirebaseStep('verify')
            setCountdown(60)
            toast.success(`Code sent to +91 ${clean}`, { id: 'firebase-otp', duration: 4000 })
        } catch (err) {
            console.error("Firebase send OTP error:", err)
            console.error("Firebase customData:", err?.customData)
            if (recaptchaVerifierRef.current) {
                try { recaptchaVerifierRef.current.clear() } catch {}
                recaptchaVerifierRef.current = null
            }
            const container = document.getElementById('recaptcha-container')
            if (container) container.innerHTML = ''

            const innerError = err?.customData?._tokenResponse?.error?.message || ''
            let msg = 'Failed to send SMS OTP.'
            const code = err?.code || ''

            if (innerError.includes('BILLING_NOT_ENABLED') || code === 'auth/internal-error') {
                msg = 'Firebase requires Blaze plan (pay-as-you-go) to send real SMS. You can also test with numbers added under "Phone numbers for testing" in Firebase.'
            } else if (code === 'auth/invalid-phone-number') {
                msg = 'Invalid 10-digit mobile number format.'
            } else if (code === 'auth/too-many-requests') {
                msg = 'Too many attempts. Please wait a few minutes before trying again.'
            } else if (code === 'auth/operation-not-allowed') {
                msg = 'Phone provider is not enabled. In Firebase Console > Authentication > Sign-in method, click Phone and toggle Enable -> Save.'
            } else if (code === 'auth/unauthorized-domain') {
                msg = `Domain "${window?.location?.hostname}" is not authorized. Add it in Firebase Console > Authentication > Settings > Authorized domains.`
            } else if (code === 'auth/invalid-app-credential') {
                msg = 'Phone verification check failed. Please ensure Phone is Enabled in Firebase Console.'
            } else if (code === 'auth/quota-exceeded') {
                msg = 'Daily SMS limit reached. Please use Email OTP.'
            } else if (innerError) {
                msg = `${innerError} (${code || 'auth/error'})`
            } else if (err?.message) {
                msg = `${err.message} (${code || 'auth/error'})`
            }
            toast.error(msg, { id: 'firebase-otp', duration: 8000 })
        } finally {
            setLoading(false)
        }
    }

    // ── FIREBASE PHONE OTP: VERIFY ──
    const handleVerifyFirebaseOtp = async (e) => {
        e?.preventDefault()
        toast.dismiss()
        const otpCode = firebaseOtp.join('').trim()
        if (otpCode.length !== 6) {
            toast.error('Please enter the 6-digit verification code')
            return
        }

        if (!confirmationResult) {
            toast.error('Session expired. Please request a new code.')
            setFirebaseStep('input')
            return
        }

        try {
            setLoading(true)
            toast.loading('Verifying code...', { id: 'firebase-verify' })

            const userCredential = await confirmationResult.confirm(otpCode)
            const idToken = await userCredential.user.getIdToken()

            const res = await Axios({
                url: SummaryApi.firebasePhoneLogin?.url || '/api/user/firebase-phone-login',
                method: SummaryApi.firebasePhoneLogin?.method || 'post',
                data: {
                    idToken,
                    name: custName.trim() || undefined,
                    referralCode: refCode || undefined
                }
            })

            if (res.data?.success) {
                toast.success('Login successful', { id: 'firebase-verify', duration: 3000 })
                const token = res.data.data?.accesstoken || res.data.data?.accessToken
                const refresh = res.data.data?.refreshToken || res.data.data?.refreshtoken
                await handleLoginSuccess(token, refresh)
            } else {
                toast.error(res.data?.message || 'Authentication failed. Please try again.', { id: 'firebase-verify', duration: 4000 })
            }
        } catch (err) {
            console.error("Firebase OTP verification error:", err)
            let msg = err?.response?.data?.message || 'Invalid verification code. Please check and try again.'
            if (err?.code === 'auth/invalid-verification-code') {
                msg = 'Incorrect verification code. Please try again.'
            } else if (err?.code === 'auth/code-expired') {
                msg = 'Verification code has expired. Please request a new code.'
            }
            toast.error(msg, { id: 'firebase-verify', duration: 4000 })
        } finally {
            setLoading(false)
        }
    }

    const handleFirebaseOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return
        const newOtp = [...firebaseOtp]
        newOtp[index] = value.slice(-1)
        setFirebaseOtp(newOtp)

        if (value && index < 5 && firebaseOtpRefs.current[index + 1]) {
            firebaseOtpRefs.current[index + 1].focus()
        }
    }

    const handleFirebaseOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !firebaseOtp[index] && index > 0) {
            firebaseOtpRefs.current[index - 1].focus()
        }
    }

    const handleFirebaseOtpPaste = (e) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').trim().slice(0, 6)
        if (/^\d+$/.test(pastedData)) {
            const digits = pastedData.split('')
            const newOtp = [...firebaseOtp]
            digits.forEach((d, i) => {
                if (i < 6) newOtp[i] = d
            })
            setFirebaseOtp(newOtp)
            if (digits.length === 6 && firebaseOtpRefs.current[5]) {
                firebaseOtpRefs.current[5].focus()
            }
        }
    }

    // ── 2. EMAIL OTP FLOW ──
    const handleSendOtp = async (e) => {
        e?.preventDefault()
        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !cleanEmail.includes('@')) {
            toast.error('Please enter a valid email address.')
            return
        }

        try {
            setLoading(true)
            toast.loading('Sending verification code...', { id: 'otp-send' })

            const res = await Axios({
                url: SummaryApi.sendOtp?.url || '/api/otp/send',
                method: SummaryApi.sendOtp?.method || 'post',
                data: { email: cleanEmail }
            })

            if (res.data?.success) {
                toast.success('6-digit code sent to your email', { id: 'otp-send', duration: 4000 })
                setStep('verify')
                setCountdown(30)
            } else {
                toast.error(res.data?.message || 'Failed to send code', { id: 'otp-send', duration: 4000 })
            }
        } catch (err) {
            let errMsg = err?.rateLimitMessage || err?.response?.data?.message || err?.message || 'Failed to send code. Please try again.'
            if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('network error')) {
                errMsg = 'Unable to reach server. Please check your internet connection.'
            }
            toast.error(errMsg, { id: 'otp-send', duration: 4000 })
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOtp = async (e) => {
        e?.preventDefault()
        const otpCode = otp.join('').trim()
        if (otpCode.length !== 6) {
            toast.error('Please enter the 6-digit code.')
            return
        }

        try {
            setLoading(true)
            toast.loading('Verifying code...', { id: 'otp-verify' })

            const res = await Axios({
                url: SummaryApi.verifyOtp?.url || '/api/otp/verify',
                method: SummaryApi.verifyOtp?.method || 'post',
                data: {
                    email: email.trim().toLowerCase(),
                    otp: otpCode,
                    name: name.trim() || undefined,
                    referralCode: refCode || undefined
                }
            })

            if (res.data?.success) {
                toast.success('Login successful', { id: 'otp-verify', duration: 3000 })
                const token = res.data.data?.accesstoken || res.data.data?.accessToken
                const refresh = res.data.data?.refreshToken || res.data.data?.refreshtoken
                await handleLoginSuccess(token, refresh)
            } else {
                toast.error(res.data?.message || 'Invalid verification code', { id: 'otp-verify', duration: 4000 })
            }
        } catch (err) {
            let errMsg = err?.rateLimitMessage || err?.response?.data?.message || err?.message || 'Verification failed. Please try again.'
            if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('network error')) {
                errMsg = 'Unable to reach server. Please check your internet connection.'
            }
            toast.error(errMsg, { id: 'otp-verify', duration: 4000 })
        } finally {
            setLoading(false)
        }
    }

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return
        const newOtp = [...otp]
        newOtp[index] = value.slice(-1)
        setOtp(newOtp)

        if (value && index < 5 && otpInputRefs.current[index + 1]) {
            otpInputRefs.current[index + 1].focus()
        }
    }

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1].focus()
        }
    }

    const handleOtpPaste = (e) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').trim().slice(0, 6)
        if (/^\d+$/.test(pastedData)) {
            const digits = pastedData.split('')
            const newOtp = [...otp]
            digits.forEach((d, i) => {
                if (i < 6) newOtp[i] = d
            })
            setOtp(newOtp)
            if (digits.length === 6 && otpInputRefs.current[5]) {
                otpInputRefs.current[5].focus()
            }
        }
    }

    const whatsappSupportUrl = `https://wa.me/919472026580?text=${encodeURIComponent(
        `Hi Snapit Support, I need assistance logging into my account for mobile: ${custMobile || email || 'my account'}`
    )}`

    return (
        <section className="min-h-screen bg-[#F4F6F8] flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-[420px]">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">

                    {/* Brand Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <img
                            src={snapitLogo}
                            alt="Snapit"
                            className="w-11 h-11 object-contain"
                            width={44}
                            height={44}
                        />
                        <div>
                            <h1 className="text-xl font-black text-gray-900 leading-tight">Snapit</h1>
                            <span className="text-[11px] font-semibold text-gray-500">
                                9-Minute Express Delivery
                            </span>
                        </div>
                    </div>

                    {/* Tab Switcher: Mobile OTP vs Email OTP */}
                    <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode('mobile_otp')
                                setFirebaseStep('input')
                            }}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                authMode === 'mobile_otp'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <MdPhoneAndroid className="text-base" />
                            <span>Mobile OTP</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode('email_otp')
                                setStep('input')
                            }}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                authMode === 'email_otp'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <MdEmail className="text-base" />
                            <span>Email OTP</span>
                        </button>
                    </div>

                    {/* Invisible reCAPTCHA container for Firebase */}
                    <div id="recaptcha-container"></div>

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* OPTION 1: MOBILE OTP VIA FIREBASE                             */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {authMode === 'mobile_otp' && (
                        <div>
                            {firebaseStep === 'input' ? (
                                <form onSubmit={handleSendFirebaseOtp} className="space-y-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Sign in with Mobile</h2>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Enter your phone number to receive a 6-digit SMS verification code.
                                        </p>
                                    </div>

                                    {/* Name Input (Optional for delivery) */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Your Name <span className="font-normal text-gray-400">(Optional)</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdPerson className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={custName}
                                                onChange={e => setCustName(e.target.value)}
                                                placeholder="e.g. Rahul Kumar"
                                                className="w-full bg-transparent outline-none text-sm font-medium text-gray-900 placeholder-gray-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Mobile Number Input */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Phone Number <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <span className="text-sm font-bold text-gray-700 mr-2 flex items-center gap-1 select-none border-r border-gray-200 pr-2">
                                                +91
                                            </span>
                                            <input
                                                type="tel"
                                                inputMode="numeric"
                                                maxLength={10}
                                                value={custMobile}
                                                onChange={e => setCustMobile(e.target.value.replace(/\D/g, ''))}
                                                placeholder="10-digit mobile number"
                                                className="w-full bg-transparent outline-none text-sm font-semibold text-gray-900 placeholder-gray-400"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || custMobile.replace(/\D/g, '').length !== 10}
                                        className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2
                                            ${custMobile.replace(/\D/g, '').length === 10 && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Sending code...' : 'Continue'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyFirebaseOtp} className="space-y-5">
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setFirebaseStep('input')}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2 transition-colors"
                                        >
                                            <FaArrowLeft size={10} />
                                            <span>Change phone number</span>
                                        </button>
                                        <h2 className="text-lg font-bold text-gray-900">Enter Verification Code</h2>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Sent to <span className="font-semibold text-gray-900">+91 {custMobile}</span> via SMS
                                        </p>
                                    </div>

                                    {/* 6-digit OTP Inputs */}
                                    <div className="flex justify-between gap-2" onPaste={handleFirebaseOtpPaste}>
                                        {firebaseOtp.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={el => firebaseOtpRefs.current[index] = el}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={e => handleFirebaseOtpChange(index, e.target.value)}
                                                onKeyDown={e => handleFirebaseOtpKeyDown(index, e)}
                                                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-2xl border-2 transition-all outline-none
                                                    ${digit
                                                        ? 'border-green-600 bg-green-50/40 text-gray-900 shadow-sm'
                                                        : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-green-600 focus:bg-white'
                                                    }`}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || firebaseOtp.join('').trim().length !== 6}
                                        className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2
                                            ${firebaseOtp.join('').trim().length === 6 && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Verifying...' : 'Verify & Continue'}
                                    </button>

                                    <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                                        <span>Didn't receive SMS?</span>
                                        {countdown > 0 ? (
                                            <span className="font-semibold text-gray-400">Resend in {countdown}s</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleSendFirebaseOtp}
                                                disabled={loading}
                                                className="font-bold text-green-700 hover:text-green-900 transition-colors"
                                            >
                                                Resend Code
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* OPTION 2: EMAIL OTP FLOW                                      */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {authMode === 'email_otp' && (
                        <div>
                            {step === 'input' ? (
                                <form onSubmit={handleSendOtp} className="space-y-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Sign in with Email</h2>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Enter your email address to receive a 6-digit verification code.
                                        </p>
                                    </div>

                                    {/* Name Input (Optional) */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Your Name <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdPerson className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="e.g. Rahul Sharma"
                                                className="w-full bg-transparent outline-none text-sm font-medium text-gray-900 placeholder-gray-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Email Input */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Email Address <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdEmail className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="you@gmail.com"
                                                className="w-full bg-transparent outline-none text-sm font-medium text-gray-900 placeholder-gray-400"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !email.trim()}
                                        className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2
                                            ${email.trim() && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Sending code...' : 'Continue'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep('input')}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2 transition-colors"
                                    >
                                        <FaArrowLeft size={10} />
                                        <span>Change email ({email})</span>
                                    </button>

                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Enter Verification Code</h2>
                                        <p className="text-xs text-gray-500 mt-1">
                                            We sent a verification code to <span className="font-semibold text-gray-900">{email}</span>
                                        </p>
                                    </div>

                                    {/* 6-Digit OTP Boxes */}
                                    <div className="flex items-center justify-between gap-1.5 sm:gap-2 my-4" onPaste={handleOtpPaste}>
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={el => otpInputRefs.current[index] = el}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={e => handleOtpChange(index, e.target.value)}
                                                onKeyDown={e => handleOtpKeyDown(index, e)}
                                                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-2xl border-2 transition-all outline-none
                                                    ${digit
                                                        ? 'border-green-600 bg-green-50/40 text-gray-900 shadow-sm'
                                                        : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-green-600 focus:bg-white'
                                                    }`}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || otp.join('').length !== 6}
                                        className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2
                                            ${otp.join('').length === 6 && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Verifying...' : 'Verify & Continue'}
                                    </button>

                                    {/* Resend Code */}
                                    <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                                        <span>Didn't receive email?</span>
                                        {countdown > 0 ? (
                                            <span className="font-semibold text-gray-400">Resend in {countdown}s</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleSendOtp}
                                                className="font-bold text-green-700 hover:text-green-900 transition-colors"
                                            >
                                                Resend Code
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Quick Support Link */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center">
                        <a
                            href={whatsappSupportUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-emerald-700 transition-colors"
                        >
                            <FaWhatsapp className="text-sm text-emerald-600" />
                            <span>Need help? Contact Customer Support</span>
                        </a>
                    </div>

                    {/* Terms & Privacy */}
                    <div className="mt-4 text-center">
                        <p className="text-[11px] text-gray-400">
                            By continuing, you agree to Snapit's{' '}
                            <Link to="/privacy-policy" className="text-gray-600 font-semibold underline underline-offset-2 hover:text-gray-900">Terms & Privacy Policy</Link>.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    )
}

export default Login