import React, { useState, useRef, useEffect } from 'react'
import { FaRegEyeSlash, FaRegEye, FaBolt, FaArrowLeft } from "react-icons/fa6"
import { MdEmail, MdLock, MdPerson } from "react-icons/md"
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setUserDetails } from '../store/userSlice'
import fetchUserDetails from '../utils/fetchUserDetails'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants/storageKeys'
import secureStorage from '../utils/secureStorage'
import snapitLogo from '/logo.png'

const Login = () => {
    const [searchParams] = useSearchParams()
    const refCode = searchParams.get('ref') || ''

    // 'otp' (default) or 'password'
    const [authMode, setAuthMode] = useState('otp')
    
    // Step: 'input' (enter email/name) or 'verify' (enter 6-digit code)
    const [step, setStep] = useState('input')

    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [loading, setLoading] = useState(false)
    const [countdown, setCountdown] = useState(0)

    const otpInputRefs = useRef([])
    const dispatch = useDispatch()
    const navigate = useNavigate()

    // Auto-dismiss any lingering toasts when switching mode or step
    useEffect(() => {
        toast.dismiss()
    }, [authMode, step])

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
        if (token) await secureStorage.setItem('accessToken', token)
        if (refresh) await secureStorage.setItem('refreshToken', refresh)

        const userDetails = await fetchUserDetails()
        if (userDetails?.success && userDetails.data) {
            dispatch(setUserDetails(userDetails.data))
            const role = (userDetails.data.role || '').toUpperCase()
            if (role === 'RIDER') {
                navigate('/rider/dashboard', { replace: true })
                return
            }
            if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
                navigate('/dashboard/orders', { replace: true })
                return
            }
            if (role === 'SELLER' || role === 'RESTO_SELLER') {
                navigate('/dashboard/store-orders', { replace: true })
                return
            }
        }

        navigate('/', { replace: true })
    }

    // ── 1. SEND OTP via Resend ──
    const handleSendOtp = async (e) => {
        e?.preventDefault()
        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !cleanEmail.includes('@')) {
            toast.error('Please enter a valid email address.')
            return
        }

        // Automatic smart redirect for rider/staff accounts
        if (cleanEmail.endsWith('@snapit.express') || cleanEmail.includes('.rider@') || cleanEmail.includes('.admin@')) {
            toast('Rider/Staff account detected. Please sign in with your password.', { icon: '🔑' })
            setAuthMode('password')
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
            const errMsg = err?.rateLimitMessage || err?.response?.data?.message || err?.message || 'Failed to send code. Please try again.'
            toast.error(errMsg, { id: 'otp-send', duration: 4000 })
        } finally {
            setLoading(false)
        }
    }

    // ── 2. VERIFY OTP ──
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
            const errMsg = err?.rateLimitMessage || err?.response?.data?.message || err?.message || 'Verification failed. Please try again.'
            toast.error(errMsg, { id: 'otp-verify', duration: 4000 })
        } finally {
            setLoading(false)
        }
    }

    // Handle OTP input navigation
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

    // ── 3. PASSWORD LOGIN (Optional / Fallback) ──
    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        toast.dismiss()
        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !password.trim()) {
            toast.error('Please enter email and password')
            return
        }

        try {
            setLoading(true)
            toast.loading('Signing in...', { id: 'pwd-login' })
            const res = await Axios({
                ...SummaryApi.login,
                data: { email: cleanEmail, password }
            })

            if (res.data?.success) {
                toast.success(res.data.message || 'Login successful', { id: 'pwd-login' })
                const token = res.data?.data?.accessToken || res.data?.data?.accesstoken
                const refresh = res.data?.data?.refreshToken || res.data?.data?.refreshtoken
                await handleLoginSuccess(token, refresh)
            } else {
                if (res.data?.isOtpAccount || res.data?.requiresOtp || res.data?.message?.includes('OTP')) {
                    toast.dismiss('pwd-login')
                    toast('This account uses OTP login. Sending code to your email...', { icon: '📨' })
                    setAuthMode('otp')
                    await handleSendOtp()
                } else {
                    toast.error(res.data?.message || 'Login failed', { id: 'pwd-login', duration: 4000 })
                }
            }
        } catch (err) {
            if (err?.response?.data?.message?.includes('OTP') || err?.response?.data?.isOtpAccount) {
                toast.dismiss('pwd-login')
                toast('This account uses OTP login. Sending code to your email...', { icon: '📨' })
                setAuthMode('otp')
                await handleSendOtp()
            } else {
                const errMsg = err?.rateLimitMessage || err?.response?.data?.message || err?.message || 'Login failed. Please check credentials.'
                toast.error(errMsg, { id: 'pwd-login', duration: 4000 })
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="min-h-screen bg-gradient-to-b from-green-50/70 to-emerald-50/40 flex items-center justify-center px-4 py-8 pt-safe">
            <div className="w-full max-w-md">
                {/* Card Container */}
                <div className="bg-white rounded-3xl border border-green-100/80 p-6 sm:p-8 shadow-sm w-full overflow-hidden">
                    
                    {/* Header Logo */}
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3">
                            <img
                                src={snapitLogo}
                                alt="Snapit"
                                className="w-10 h-10 object-contain"
                                width={40}
                                height={40}
                            />
                            <div>
                                <h1 className="text-xl font-black text-gray-900 leading-tight">Snapit</h1>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-800 bg-green-100/80 rounded-full px-2 py-0.5 mt-0.5">
                                    <FaBolt className="text-[9px] text-amber-500" />
                                    10-Min Express Delivery
                                </span>
                            </div>
                        </div>

                        {/* Mode Switcher Pills */}
                        {step === 'input' && (
                            <button
                                type="button"
                                onClick={() => setAuthMode(prev => prev === 'otp' ? 'password' : 'otp')}
                                className="text-[11px] font-bold text-green-800 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl hover:bg-green-100 transition-colors shadow-xs"
                            >
                                {authMode === 'otp' ? 'Sign in with Password' : 'Sign in with OTP'}
                            </button>
                        )}
                    </div>

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* OPTION A: OTP FLOW (Default & Seamless)                       */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {authMode === 'otp' && (
                        <div>
                            {step === 'input' ? (
                                <form onSubmit={handleSendOtp} className="space-y-4">
                                    <div>
                                        <h2 className="text-lg font-black text-gray-900">Welcome to Snapit! ⚡</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Enter your email to receive a fast 6-digit login code.
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
                                        {loading ? 'Sending Code...' : '⚡ Get 6-Digit Login Code'}
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

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* OPTION B: PASSWORD LOGIN (For Admin / Super Admin)             */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {authMode === 'password' && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <h2 className="text-lg font-black text-gray-900">Sign in with Password</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Sign in with your registered email and password</p>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Email address</label>
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                    <MdEmail className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                    <MdLock className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        className="text-gray-400 hover:text-gray-600 ml-2 focus:outline-none"
                                    >
                                        {showPassword ? <FaRegEye className="text-base" /> : <FaRegEyeSlash className="text-base" />}
                                    </button>
                                </div>
                                <div className="text-right mt-1.5">
                                    <Link to="/forgot-password" className="text-xs text-green-700 hover:text-green-900 font-semibold transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email.trim() || !password.trim()}
                                className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm
                                    ${email.trim() && password.trim() && !loading
                                        ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {loading ? 'Signing in...' : 'Sign in with Password'}
                            </button>
                        </form>
                    )}

                    {/* Bottom Help Text */}
                    <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-500">
                            By continuing, you agree to Snapit's{' '}
                            <span className="text-green-700 font-semibold">Terms of Service</span> &{' '}
                            <span className="text-green-700 font-semibold">Privacy Policy</span>.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    )
}

export default Login