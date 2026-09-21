import React, { useState, useRef, useEffect } from 'react'
import { FaArrowLeft, FaWhatsapp, FaRegEye, FaRegEyeSlash } from "react-icons/fa6"
import { MdEmail, MdPerson, MdPhoneAndroid, MdLockOutline } from "react-icons/md"
import { IoClose } from "react-icons/io5"
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setUserDetails } from '../store/userSlice'
import fetchUserDetails from '../utils/fetchUserDetails'
import secureStorage from '../utils/secureStorage'
import snapitLogo from '../assets/snapit.png'

const Login = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const refCode = searchParams.get('ref') || ''

    // 'mobile_pin' (default) or 'email_otp'
    const [authMode, setAuthMode] = useState('mobile_pin')

    // ── Mobile PIN Mode: 'login' or 'register' ──
    const initialMode = (
        searchParams.get('mode') === 'register' ||
        searchParams.get('register') === 'true' ||
        searchParams.get('signup') === 'true'
    ) ? 'register' : 'login'
    const [mobileMode, setMobileMode] = useState(initialMode)
    const [mobileNumber, setMobileNumber] = useState('')
    const [pin, setPin] = useState('')
    const [showPin, setShowPin] = useState(false)

    // Register inputs
    const [regName, setRegName] = useState('')
    const [regMobile, setRegMobile] = useState('')
    const [regPin, setRegPin] = useState('')
    const [showRegPin, setShowRegPin] = useState(false)
    const [regRefCode, setRegRefCode] = useState(refCode)

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

    // Auto-dismiss toasts when switching mode
    useEffect(() => {
        toast.dismiss()
    }, [authMode, mobileMode, step])

    // Sync mobileMode with query params (?mode=register, ?register=true, or ?signup=true)
    useEffect(() => {
        const mode = searchParams.get('mode')
        const isRegister = mode === 'register' || searchParams.get('register') === 'true' || searchParams.get('signup') === 'true'
        if (isRegister && mobileMode !== 'register') {
            setMobileMode('register')
        } else if (!isRegister && mobileMode !== 'login') {
            setMobileMode('login')
        }
    }, [searchParams, mobileMode])

    const switchMobileMode = (newMode) => {
        setMobileMode(newMode)
        if (newMode === 'register') {
            if (mobileNumber && !regMobile) setRegMobile(mobileNumber)
            if (pin && pin.trim().length >= 4 && !regPin) setRegPin(pin.trim())
        } else {
            if (regMobile && !mobileNumber) setMobileNumber(regMobile)
            if (regPin && !pin) setPin(regPin)
        }
        const newParams = new URLSearchParams(searchParams)
        if (newMode === 'register') {
            newParams.set('mode', 'register')
        } else {
            newParams.delete('mode')
            newParams.delete('register')
            newParams.delete('signup')
        }
        setSearchParams(newParams, { replace: true })
    }

    const handleCloseAuth = () => {
        const redirectPath = searchParams.get('redirect')
        if (redirectPath && !redirectPath.startsWith('/login') && !redirectPath.startsWith('/register')) {
            navigate(redirectPath, { replace: true })
        } else if (window.history.length > 1) {
            navigate(-1)
        } else {
            navigate('/', { replace: true })
        }
    }

    // Countdown timer for Resend Email OTP
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

        let redirectPath = searchParams.get('redirect') || '/'
        if (redirectPath.startsWith('/login') || redirectPath.startsWith('/register')) {
            redirectPath = '/'
        }
        navigate(redirectPath, { replace: true })
    }

    // ── 1. MOBILE LOGIN (10-Digit Mobile + 4-Digit PIN) ──
    const handleMobileLogin = async (e) => {
        e.preventDefault()
        toast.dismiss()
        const clean = mobileNumber.replace(/\D/g, '')
        if (clean.length !== 10) {
            toast.error('Please enter a valid 10-digit mobile number')
            return
        }
        if (!pin.trim()) {
            // New user without a PIN yet -> seamlessly move to Create Account
            switchMobileMode('register')
            setRegMobile(clean)
            toast("New to Snapit? Let's create your account in 5 seconds 🎉", { id: 'mobile-login', duration: 4000 })
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
                toast.success('Welcome back to Snapit', { id: 'mobile-login', duration: 3000 })
                const token = res.data.data?.accesstoken || res.data.data?.accessToken
                const refresh = res.data.data?.refreshToken || res.data.data?.refreshtoken
                await handleLoginSuccess(token, refresh)
            } else {
                toast.error(res.data?.message || 'Login failed. Please check your PIN.', { id: 'mobile-login', duration: 4000 })
            }
        } catch (err) {
            const resData = err?.response?.data
            const msg = resData?.message || err?.message || 'Sign in failed. Please check your mobile number and PIN.'
            if (resData?.notRegistered || msg.toLowerCase().includes('not registered') || msg.toLowerCase().includes('create account') || msg.toLowerCase().includes('no account found')) {
                switchMobileMode('register')
                setRegMobile(clean)
                if (pin && pin.trim().length >= 4) {
                    setRegPin(pin.trim())
                }
                toast.success("Welcome! Let's create your account in 5 seconds 🎉", { id: 'mobile-login', duration: 4000 })
            } else {
                toast.error(msg, { id: 'mobile-login', duration: 5000 })
            }
        } finally {
            setLoading(false)
        }
    }

    // ── 2. MOBILE REGISTRATION (Name + 10-Digit Mobile + 4-Digit PIN) ──
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
            toast.error('Please choose a PIN of at least 4 digits')
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
                    referralCode: (regRefCode || '').trim() || undefined
                }
            })

            if (res.data?.success) {
                toast.success('Account created successfully', { id: 'mobile-reg', duration: 3000 })
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

    // ── 3. EMAIL OTP FLOW ──
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

    const activePhoneForReset = mobileNumber || regMobile || ''
    const whatsappResetUrl = `https://wa.me/919472026580?text=${encodeURIComponent(
        `Hi Snapit Support, I forgot my 4-digit PIN for mobile: ${activePhoneForReset || 'my account'}. Please help me reset it.`
    )}`

    const whatsappSupportUrl = `https://wa.me/919472026580?text=${encodeURIComponent(
        `Hi Snapit Support, I need assistance with my account for mobile: ${activePhoneForReset || email || 'my account'}`
    )}`

    return (
        <section className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-8">

            {/* ── BACKGROUND: Snapit green gradient (Blinkit / Zepto style) ── */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-500 to-teal-400" />

            {/* ── Subtle radial light bloom at top-right (depth) ── */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-800/30 rounded-full blur-3xl pointer-events-none" />

            {/* ── Floating grocery items — purely decorative ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
                {/* Row 1 — top scatter */}
                <span className="absolute text-4xl opacity-25 top-6 left-[6%] rotate-12 animate-[bounce_6s_ease-in-out_infinite]">🥛</span>
                <span className="absolute text-3xl opacity-20 top-12 left-[22%] -rotate-6 animate-[bounce_7.5s_ease-in-out_1s_infinite]">🧀</span>
                <span className="absolute text-5xl opacity-20 top-4 left-[45%] rotate-3 animate-[bounce_5s_ease-in-out_0.5s_infinite]">🥚</span>
                <span className="absolute text-3xl opacity-25 top-8 right-[20%] rotate-12 animate-[bounce_8s_ease-in-out_2s_infinite]">🍌</span>
                <span className="absolute text-4xl opacity-20 top-3 right-[5%] -rotate-12 animate-[bounce_6.5s_ease-in-out_0.3s_infinite]">🍎</span>

                {/* Left edge — middle */}
                <span className="absolute text-5xl opacity-20 top-[28%] left-[1%] rotate-6 animate-[bounce_9s_ease-in-out_1.5s_infinite]">🥦</span>
                <span className="absolute text-3xl opacity-20 top-[42%] left-[4%] -rotate-6 animate-[bounce_7s_ease-in-out_0.8s_infinite]">🧅</span>
                <span className="absolute text-4xl opacity-25 top-[58%] left-[2%] rotate-12 animate-[bounce_8s_ease-in-out_2.5s_infinite]">🍋</span>

                {/* Right edge — middle */}
                <span className="absolute text-5xl opacity-20 top-[30%] right-[1%] -rotate-12 animate-[bounce_7s_ease-in-out_0.4s_infinite]">🍅</span>
                <span className="absolute text-4xl opacity-20 top-[46%] right-[3%] rotate-6 animate-[bounce_6s_ease-in-out_1.8s_infinite]">🥕</span>
                <span className="absolute text-3xl opacity-25 top-[62%] right-[2%] -rotate-3 animate-[bounce_9s_ease-in-out_1s_infinite]">🧄</span>

                {/* Bottom scatter */}
                <span className="absolute text-4xl opacity-20 bottom-10 left-[8%] rotate-6 animate-[bounce_8s_ease-in-out_0.6s_infinite]">🍞</span>
                <span className="absolute text-3xl opacity-25 bottom-8 left-[25%] -rotate-12 animate-[bounce_6.5s_ease-in-out_1.2s_infinite]">🍫</span>
                <span className="absolute text-4xl opacity-20 bottom-12 left-[50%] rotate-3 animate-[bounce_7s_ease-in-out_2s_infinite]">🥤</span>
                <span className="absolute text-3xl opacity-25 bottom-6 right-[22%] -rotate-6 animate-[bounce_8.5s_ease-in-out_0.9s_infinite]">🍪</span>
                <span className="absolute text-4xl opacity-20 bottom-8 right-[6%] rotate-12 animate-[bounce_6s_ease-in-out_1.5s_infinite]">🍊</span>

                {/* Extra mid-area fill */}
                <span className="absolute text-3xl opacity-15 top-[20%] left-[38%] -rotate-6 animate-[bounce_10s_ease-in-out_0.7s_infinite]">🌽</span>
                <span className="absolute text-3xl opacity-15 top-[70%] right-[35%] rotate-6 animate-[bounce_9s_ease-in-out_1.3s_infinite]">🥑</span>
                <span className="absolute text-2xl opacity-15 top-[55%] left-[38%] rotate-12 animate-[bounce_11s_ease-in-out_2.1s_infinite]">🫐</span>
            </div>

            {/* ── Main Content Container: Left Branding + Auth Card ── */}
            <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 z-10">

                {/* ── Left panel: only visible on large screens ── */}
                <div className="hidden lg:flex flex-col items-start justify-center flex-1 max-w-lg">
                    <div className="inline-flex items-center gap-3 bg-white/95 backdrop-blur-md rounded-2xl px-5 py-3 shadow-xl border border-white/40 mb-6">
                    <img src={snapitLogo} alt="Snapit" className="h-10 w-auto object-contain" />
                    <span className="h-5 w-px bg-slate-200" />
                    <span className="text-xs font-bold text-emerald-800 tracking-tight uppercase">9-Min Delivery</span>
                </div>

                {/* Tagline */}
                <h2 className="text-4xl font-black text-white leading-snug mb-4">
                    Groceries at<br />
                    <span className="text-yellow-300">lightning speed</span>
                </h2>
                <p className="text-emerald-100 text-base leading-relaxed mb-8 max-w-sm">
                    Order fresh fruits, vegetables, dairy, snacks and daily essentials — delivered to your door in 9 minutes from Paliganj.
                </p>

                {/* Trust badges */}
                <div className="flex flex-col gap-3">
                    {[
                        { icon: '🚀', label: '9-Minute Delivery', sub: 'Express delivery in Paliganj' },
                        { icon: '🛡️', label: '100% Safe & Secure', sub: 'Encrypted payments & data' },
                        { icon: '🎁', label: 'Exclusive Offers', sub: 'Save more on every order' },
                    ].map((b, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                            <span className="text-2xl">{b.icon}</span>
                            <div>
                                <p className="text-white font-bold text-sm">{b.label}</p>
                                <p className="text-emerald-100 text-xs">{b.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Auth Card ── */}
            <div className="w-full max-w-[420px] z-10">
                {/* Mobile-only mini brand strip above card */}
                <div className="lg:hidden flex items-center justify-center mb-4">
                    <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-2 shadow-lg border border-white/40">
                        <img src={snapitLogo} alt="Snapit" className="h-7 w-auto object-contain" />
                        <span className="h-3.5 w-px bg-slate-200" />
                        <span className="text-emerald-800 text-[11px] font-black tracking-tight uppercase">9 Min Delivery</span>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8">

                    {/* Brand Header & Return Button */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <img
                                src={snapitLogo}
                                alt="Snapit"
                                className="h-9 w-auto object-contain"
                            />
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                9-Min Delivery
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCloseAuth}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Return to shopping"
                            aria-label="Close"
                        >
                            <IoClose size={18} />
                        </button>
                    </div>

                    {/* Primary Tab Switcher: Sign In vs Create Account */}
                    {authMode === 'mobile_pin' ? (
                        <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                            <button
                                type="button"
                                onClick={() => switchMobileMode('login')}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                                    mobileMode === 'login'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => switchMobileMode('register')}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                                    mobileMode === 'register'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Create Account
                            </button>
                        </div>
                    ) : (
                        <div className="mb-5">
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthMode('mobile_pin')
                                    setStep('input')
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <FaArrowLeft size={11} />
                                <span>Back to Mobile Login</span>
                            </button>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* OPTION 1: MOBILE & PIN (Instant 5-Second Login / Register)     */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {authMode === 'mobile_pin' && (
                        <div>
                            {mobileMode === 'login' ? (
                                /* ── Mobile Sign In Form ── */
                                <form onSubmit={handleMobileLogin} className="space-y-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Welcome Back</h2>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Enter your mobile number and 4-digit PIN to continue.
                                        </p>
                                    </div>

                                    {/* Mobile Number */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Mobile Number <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <span className="text-sm font-bold text-gray-700 mr-2 flex items-center gap-1 select-none border-r border-gray-200 pr-2">
                                                +91
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

                                    {/* 4-Digit PIN */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-xs font-semibold text-gray-700">
                                                4-Digit PIN <span className="text-rose-500">*</span>
                                            </label>
                                            <a
                                                href={whatsappResetUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                                            >
                                                Forgot PIN?
                                            </a>
                                        </div>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdLockOutline className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type={showPin ? "text" : "password"}
                                                inputMode="numeric"
                                                maxLength={8}
                                                value={pin}
                                                onChange={e => setPin(e.target.value)}
                                                placeholder="Enter your 4-digit PIN"
                                                className="w-full bg-transparent outline-none text-sm font-semibold text-gray-900 placeholder-gray-400"
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
                                        disabled={loading || mobileNumber.replace(/\D/g, '').length !== 10}
                                        className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2
                                            ${mobileNumber.replace(/\D/g, '').length === 10 && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Signing in...' : 'Sign In'}
                                    </button>

                                    {/* Clean Switch Prompt */}
                                    <p className="text-center text-xs text-gray-600 pt-1">
                                        New to Snapit?{' '}
                                        <button
                                            type="button"
                                            onClick={() => switchMobileMode('register')}
                                            className="font-bold text-green-700 hover:text-green-800 hover:underline transition-colors"
                                        >
                                            Create an account
                                        </button>
                                    </p>

                                    {/* Alternative Sign In Options */}
                                    <div className="relative flex items-center justify-center my-2">
                                        <div className="border-t border-gray-100 w-full" />
                                        <span className="bg-white px-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                                            or
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthMode('email_otp')
                                            setStep('input')
                                        }}
                                        className="w-full h-11 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <MdEmail className="text-base text-gray-500" />
                                        <span>Continue with Email OTP</span>
                                    </button>
                                </form>
                            ) : (
                                /* ── Mobile Create Account Form ── */
                                <form onSubmit={handleMobileRegister} className="space-y-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Create Account</h2>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Instant signup. Just your name, mobile, and a 4-digit PIN.
                                        </p>
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Your Name <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdPerson className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={regName}
                                                onChange={e => setRegName(e.target.value)}
                                                placeholder="e.g. Rahul Kumar"
                                                className="w-full bg-transparent outline-none text-sm font-medium text-gray-900 placeholder-gray-400"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Mobile */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Mobile Number <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <span className="text-sm font-bold text-gray-700 mr-2 flex items-center gap-1 select-none border-r border-gray-200 pr-2">
                                                +91
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
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Set 4-Digit PIN <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                            <MdLockOutline className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                            <input
                                                type={showRegPin ? "text" : "password"}
                                                inputMode="numeric"
                                                maxLength={8}
                                                value={regPin}
                                                onChange={e => setRegPin(e.target.value)}
                                                placeholder="Choose a 4-digit PIN (e.g. 1234)"
                                                className="w-full bg-transparent outline-none text-sm font-semibold text-gray-900 placeholder-gray-400"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowRegPin(prev => !prev)}
                                                className="text-gray-400 hover:text-gray-600 ml-2 focus:outline-none"
                                            >
                                                {showRegPin ? <FaRegEye className="text-base" /> : <FaRegEyeSlash className="text-base" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Referral Code (if available in URL) */}
                                    {refCode && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                                        className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2
                                            ${regName.trim() && regMobile.replace(/\D/g, '').length === 10 && regPin.trim().length >= 4 && !loading
                                                ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? 'Creating Account...' : 'Create Account & Continue'}
                                    </button>

                                    {/* Clean Switch Prompt */}
                                    <p className="text-center text-xs text-gray-600 pt-1">
                                        Already have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => switchMobileMode('login')}
                                            className="font-bold text-green-700 hover:text-green-800 hover:underline transition-colors"
                                        >
                                            Sign in
                                        </button>
                                    </p>

                                    {/* Alternative Sign In Options */}
                                    <div className="relative flex items-center justify-center my-2">
                                        <div className="border-t border-gray-100 w-full" />
                                        <span className="bg-white px-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                                            or
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthMode('email_otp')
                                            setStep('input')
                                        }}
                                        className="w-full h-11 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <MdEmail className="text-base text-gray-500" />
                                        <span>Continue with Email OTP</span>
                                    </button>
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

                                    <p className="text-center text-xs text-gray-600 pt-1">
                                        Prefer mobile?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setAuthMode('mobile_pin')}
                                            className="font-bold text-green-700 hover:text-green-800 hover:underline transition-colors"
                                        >
                                            Sign in with Mobile & PIN
                                        </button>
                                    </p>
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

                    {/* Support Links */}
                    <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-3 text-xs text-gray-500">
                        <a
                            href={whatsappSupportUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-emerald-700 transition-colors"
                        >
                            <FaWhatsapp className="text-emerald-600 text-sm" />
                            <span>WhatsApp Support</span>
                        </a>
                        <span className="text-gray-300">•</span>
                        <Link
                            to="/forgot-password"
                            className="font-medium text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            Email Recovery
                        </Link>
                    </div>

                    {/* Terms & Privacy */}
                    <p className="mt-3 text-center text-[11px] text-gray-400">
                        By continuing, you agree to Snapit's{' '}
                        <Link to="/privacy-policy" className="text-gray-600 font-semibold underline underline-offset-2 hover:text-gray-900">
                            Terms & Privacy Policy
                        </Link>.
                    </p>

                </div>
            </div>
            </div>
        </section>
    )
}

export default Login