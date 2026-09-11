import React, { useState, useRef, useEffect } from 'react'
import { FaRegEyeSlash, FaRegEye, FaBolt, FaArrowLeft, FaWhatsapp } from "react-icons/fa6"
import { MdEmail, MdLock, MdPerson, MdPhoneAndroid } from "react-icons/md"
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setUserDetails } from '../store/userSlice'
import fetchUserDetails from '../utils/fetchUserDetails'
import secureStorage from '../utils/secureStorage'
import snapitLogo from '/logo.png'

const Login = () => {
    const [searchParams] = useSearchParams()
    const refCode = searchParams.get('ref') || ''

    // 'mobile' (default: 10-digit phone + PIN) or 'email_otp'
    const [authMode, setAuthMode] = useState('mobile')
    // In mobile mode: 'login' or 'register'
    const [mobileMode, setMobileMode] = useState('login')

    // Mobile inputs
    const [mobileNumber, setMobileNumber] = useState('')
    const [pin, setPin] = useState('')
    const [showPin, setShowPin] = useState(false)

    // Register inputs
    const [regName, setRegName] = useState('')
    const [regMobile, setRegMobile] = useState('')
    const [regPin, setRegPin] = useState('')
    const [regRefCode, setRegRefCode] = useState(refCode)

    // Email OTP inputs
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
    }, [authMode, mobileMode, step])

    // Countdown timer for Resend OTP
    useEffect(() => {
        let timer
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000)
        }
        return () => clearInterval(timer)
    }, [countdown])

    // Auto-focus first OTP input when moving to verify step
    useEffect(() => {
        if (step === 'verify' && otpInputRefs.current[0]) {
            otpInputRefs.current[0].focus()
        }
    }, [step])

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

        // Redirect to intended destination (e.g. /checkout) or Home
        const redirectPath = searchParams.get('redirect') || '/'
        navigate(redirectPath, { replace: true })
    }

    // ── 1. MOBILE LOGIN (10-Digit + PIN) ──
    const handleMobileLogin = async (e) => {
        e.preventDefault()
        toast.dismiss()
        const clean = mobileNumber.replace(/\D/g, '')
        if (clean.length !== 10) {
            toast.error('Please enter a valid 10-digit mobile number')
            return
        }
        if (!pin.trim()) {
            toast.error('Please enter your PIN or password')
            return
        }

        try {
            setLoading(true)
            toast.loading('Signing in...', { id: 'mobile-login' })
            const res = await Axios({
                ...SummaryApi.login,
                data: { email: clean, password: pin.trim() }
            })

            if (res.data?.success) {
                toast.success('Welcome back to Snapit! 🛍️', { id: 'mobile-login', duration: 3000 })
                const token = res.data.data?.accesstoken || res.data.data?.accessToken
                const refresh = res.data.data?.refreshToken || res.data.data?.refreshtoken
                await handleLoginSuccess(token, refresh)
            } else {
                toast.error(res.data?.message || 'Login failed. Please check your PIN.', { id: 'mobile-login', duration: 4000 })
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Sign in failed. Please try again.'
            toast.error(msg, { id: 'mobile-login', duration: 5000 })
        } finally {
            setLoading(false)
        }
    }

    // ── 2. MOBILE REGISTRATION (10-Digit + PIN, 5 seconds) ──
    const handleMobileRegister = async (e) => {
        e.preventDefault()
        toast.dismiss()
        if (!regName.trim()) {
            toast.error('Please enter your name')
            return
        }
        const clean = regMobile.replace(/\D/g, '')
        if (clean.length !== 10) {
            toast.error('Please enter a valid 10-digit mobile number')
            return
        }
        if (!regPin.trim() || regPin.trim().length < 4) {
            toast.error('Please set a PIN of at least 4 digits')
            return
        }

        try {
            setLoading(true)
            toast.loading('Creating account...', { id: 'mobile-reg' })
            const res = await Axios({
                ...SummaryApi.register,
                data: {
                    name: regName.trim(),
                    email: clean,
                    password: regPin.trim(),
                    referralCode: regRefCode.trim() || undefined
                }
            })

            if (res.data?.success) {
                toast.success('Account created! Welcome to Snapit 🎉', { id: 'mobile-reg', duration: 3000 })
                const token = res.data.data?.accesstoken || res.data.data?.accessToken
                const refresh = res.data.data?.refreshToken || res.data.data?.refreshtoken
                await handleLoginSuccess(token, refresh)
            } else {
                toast.error(res.data?.message || 'Registration failed', { id: 'mobile-reg', duration: 4000 })
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Registration failed. Please try again.'
            toast.error(msg, { id: 'mobile-reg', duration: 5000 })
        } finally {
            setLoading(false)
        }
    }

    // ── 3. EMAIL OTP FLOW (Resend) ──
    const handleSendOtp = async (e) => {
        e?.preventDefault()
        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !cleanEmail.includes('@')) {
            toast.error('Please enter a valid email address.')
            return
        }

        // Automatic smart redirect for rider/staff accounts
        if (cleanEmail.endsWith('@snapit.express') || cleanEmail.includes('.rider@') || cleanEmail.includes('.admin@')) {
            toast('Rider/Staff account detected. Please sign in with your mobile/PIN or password.', { icon: '🔑' })
            setAuthMode('mobile')
            setMobileNumber(cleanEmail)
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
                toast.success('✨ 6-digit code sent to your email!', { id: 'otp-send', duration: 4000 })
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
                toast.success('🎉 Login successful!', { id: 'otp-verify', duration: 3000 })
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

    const currentPhoneForSupport = mobileNumber || regMobile || ''
    const whatsappResetUrl = `https://wa.me/919472026580?text=${encodeURIComponent(
        `Hi Snapit Support, I want to reset my PIN / password for mobile: ${currentPhoneForSupport || 'my account'}`
    )}`

    return (
        <section className="min-h-screen bg-gradient-to-b from-green-50/70 to-emerald-50/40 flex items-center justify-center px-4 py-8 pt-safe">
            <div className="w-full max-w-md">
                {/* Card Container */}
                <div className="bg-white rounded-3xl border border-green-100/80 p-6 sm:p-8 shadow-sm w-full overflow-hidden">
                    
                    {/* Header Logo & Delivery Badge */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3">
                            <img
                                src={snapitLogo}
                                alt="Snapit"
                                className="w-11 h-11 object-contain"
                                width={44}
                                height={44}
                            />
                            <div>
                                <h1 className="text-xl font-black text-gray-900 leading-tight">Snapit</h1>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-800 bg-green-100/80 rounded-full px-2.5 py-0.5 mt-0.5">
                                    <FaBolt className="text-[9px] text-amber-500" />
                                    9-Min Express Paliganj
                                </span>
                            </div>
                        </div>

                        {/* Switch between Mobile (Default) and Email OTP */}
                        <button
                            type="button"
                            onClick={() => setAuthMode(prev => prev === 'mobile' ? 'email_otp' : 'mobile')}
                            className="text-[11px] font-bold text-green-800 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl hover:bg-green-100 transition-colors"
                        >
                            {authMode === 'mobile' ? '✉️ Email OTP' : '📱 Mobile'}
                        </button>
                    </div>

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* OPTION 1: MOBILE NUMBER + PIN (Default & Fast for Paliganj)     */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {authMode === 'mobile' && (
                        <div>
                            {/* Sub-tab: Sign In vs Create Account */}
                            <div className="flex bg-gray-100 p-1 rounded-2xl mb-5">
                                <button
                                    type="button"
                                    onClick={() => setMobileMode('login')}
                                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                                        mobileMode === 'login'
                                            ? 'bg-white text-green-800 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileMode('register')
                                        if (mobileNumber && !regMobile) setRegMobile(mobileNumber)
                                    }}
                                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                                        mobileMode === 'register'
                                            ? 'bg-white text-green-800 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    Create Account
                                </button>
                            </div>

                            {mobileMode === 'login' ? (
                                /* ── Mobile Login Form ── */
                                <form onSubmit={handleMobileLogin} className="space-y-4">
                                    <div>
                                        <h2 className="text-lg font-black text-gray-900">Sign in with Mobile ⚡</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Enter your 10-digit mobile number and PIN to enter Snapit.
                                        </p>
                                    </div>

                                    {/* Mobile Number Input */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Mobile Number <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <span className="text-sm font-black text-gray-700 mr-2 flex items-center gap-1 select-none border-r border-gray-300 pr-2">
                                                <span>🇮🇳</span> +91
                                            </span>
                                            <input
                                                type="tel"
                                                inputMode="numeric"
                                                maxLength={10}
                                                value={mobileNumber}
                                                onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                                                placeholder="10-digit mobile number"
                                                className="w-full bg-transparent outline-none text-sm font-semibold text-gray-900 placeholder-gray-400"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* 4-digit PIN / Password */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-gray-700">
                                                4-Digit PIN or Password <span className="text-rose-500">*</span>
                                            </label>
                                            <a
                                                href={whatsappResetUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
                                            >
                                                <FaWhatsapp size={12} className="text-emerald-600" />
                                                <span>Forgot PIN?</span>
                                            </a>
                                        </div>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdLock className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type={showPin ? "text" : "password"}
                                                value={pin}
                                                onChange={e => setPin(e.target.value)}
                                                placeholder="Enter 4-digit PIN or password"
                                                className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPin(prev => !prev)}
                                                className="text-gray-400 hover:text-gray-600 ml-2 focus:outline-none"
                                            >
                                                {showPin ? <FaRegEye className="text-base" /> : <FaRegEyeSlash className="text-base" />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || mobileNumber.replace(/\D/g, '').length !== 10 || !pin.trim()}
                                        className={`w-full h-12 rounded-xl text-sm font-black text-white transition-all shadow-sm flex items-center justify-center gap-2
                                            ${mobileNumber.replace(/\D/g, '').length === 10 && pin.trim() && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Signing in...' : 'Sign In 🚀'}
                                    </button>

                                    <div className="text-center pt-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMobileMode('register')
                                                if (mobileNumber && !regMobile) setRegMobile(mobileNumber)
                                            }}
                                            className="text-xs font-bold text-green-700 hover:text-green-900 transition-colors"
                                        >
                                            New customer? Create account in 5 seconds &rarr;
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                /* ── Mobile Register Form ── */
                                <form onSubmit={handleMobileRegister} className="space-y-4">
                                    <div>
                                        <h2 className="text-lg font-black text-gray-900">Join Snapit! 🎉</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Fast 5-second signup. No email or complex password required.
                                        </p>
                                    </div>

                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Your Name <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdPerson className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={regName}
                                                onChange={e => setRegName(e.target.value)}
                                                placeholder="e.g. Rahul Kumar"
                                                className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* 10-Digit Mobile */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Mobile Number <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <span className="text-sm font-black text-gray-700 mr-2 flex items-center gap-1 select-none border-r border-gray-300 pr-2">
                                                <span>🇮🇳</span> +91
                                            </span>
                                            <input
                                                type="tel"
                                                inputMode="numeric"
                                                maxLength={10}
                                                value={regMobile}
                                                onChange={e => setRegMobile(e.target.value.replace(/\D/g, ''))}
                                                placeholder="10-digit mobile number"
                                                className="w-full bg-transparent outline-none text-sm font-semibold text-gray-900 placeholder-gray-400"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Set 4-Digit PIN */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Set 4-Digit PIN or Password <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdLock className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type={showPin ? "text" : "password"}
                                                value={regPin}
                                                onChange={e => setRegPin(e.target.value)}
                                                placeholder="Choose a 4-digit PIN (e.g. 1234)"
                                                className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPin(prev => !prev)}
                                                className="text-gray-400 hover:text-gray-600 ml-2 focus:outline-none"
                                            >
                                                {showPin ? <FaRegEye className="text-base" /> : <FaRegEyeSlash className="text-base" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Referral Code (Optional) */}
                                    {refCode && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                                Referral Code
                                            </label>
                                            <div className="flex items-center bg-emerald-50/60 border border-emerald-200 rounded-xl px-3.5 h-11">
                                                <input
                                                    type="text"
                                                    value={regRefCode}
                                                    onChange={e => setRegRefCode(e.target.value)}
                                                    placeholder="Referral Code"
                                                    className="w-full bg-transparent outline-none text-xs font-bold text-emerald-800 uppercase"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || !regName.trim() || regMobile.replace(/\D/g, '').length !== 10 || regPin.trim().length < 4}
                                        className={`w-full h-12 rounded-xl text-sm font-black text-white transition-all shadow-sm flex items-center justify-center gap-2
                                            ${regName.trim() && regMobile.replace(/\D/g, '').length === 10 && regPin.trim().length >= 4 && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Creating Account...' : 'Create Account & Start Shopping 🛒'}
                                    </button>

                                    <div className="text-center pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setMobileMode('login')}
                                            className="text-xs font-bold text-green-700 hover:text-green-900 transition-colors"
                                        >
                                            Already registered? Sign in &rarr;
                                        </button>
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
                                        <h2 className="text-lg font-black text-gray-900">Sign in with Email ✉️</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            We will send a 6-digit verification code to your email.
                                        </p>
                                    </div>

                                    {/* Name (Optional / For New Users) */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Your Name <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdPerson className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="e.g. Rahul Sharma"
                                                className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Email Address <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdEmail className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="you@gmail.com"
                                                className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !email.trim()}
                                        className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm
                                            ${email.trim() && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Sending Code...' : '⚡ Get 6-Digit Email Code'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep('input')}
                                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-semibold mb-2 transition-colors"
                                    >
                                        <FaArrowLeft size={10} />
                                        <span>Change email ({email})</span>
                                    </button>

                                    <div>
                                        <h2 className="text-lg font-black text-gray-900">Enter 6-Digit Code 📬</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            We sent a verification code to <span className="font-bold text-gray-800">{email}</span>
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
                                                className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg font-black text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-600 focus:bg-white outline-none transition-all"
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || otp.join('').length !== 6}
                                        className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm
                                            ${otp.join('').length === 6 && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Verifying...' : '🚀 Verify & Enter Snapit'}
                                    </button>

                                    {/* Resend Code */}
                                    <div className="text-center pt-2">
                                        {countdown > 0 ? (
                                            <p className="text-xs text-gray-400 font-medium">
                                                Resend code in <span className="font-bold text-gray-700">{countdown}s</span>
                                            </p>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleSendOtp}
                                                className="text-xs font-bold text-green-700 hover:text-green-900 transition-colors"
                                            >
                                                Didn't receive code? Resend OTP
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* WhatsApp Quick Assistance */}
                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-center">
                        <a
                            href={whatsappResetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors"
                        >
                            <FaWhatsapp className="text-sm text-emerald-600" />
                            <span>Need help? WhatsApp Support</span>
                        </a>
                    </div>

                    {/* Bottom Legal Text */}
                    <div className="mt-4 text-center">
                        <p className="text-[11px] text-gray-400">
                            By continuing, you agree to Snapit's{' '}
                            <Link to="/privacy-policy" className="text-green-700 font-semibold underline underline-offset-2">Terms & Privacy Policy</Link>.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    )
}

export default Login