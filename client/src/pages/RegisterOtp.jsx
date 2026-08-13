import React, { useState } from 'react'
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

const RegisterOtp = () => {
    const [searchParams] = useSearchParams()
    const refCode = searchParams.get('ref')
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const [step, setStep] = useState(1) // 1 = enter name+email, 2 = enter otp
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState({
        name: "",
        email: "",
        otp: "",
        referralCode: refCode || ""
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setData((prev) => ({ ...prev, [name]: value }))
    }

    const canSendOtp = data.name.trim() && data.email.trim()
    const canVerifyOtp = data.otp.trim().length === 6

    const handleSendOtp = async (e) => {
        e.preventDefault()
        if (!canSendOtp) return
        setLoading(true)
        try {
            const response = await Axios({
                ...SummaryApi.sendOtp,
                data: { email: data.email }
            })
            if (response.data.error) {
                toast.error(response.data.message)
            } else {
                toast.success(response.data.message || 'OTP sent to your email')
                setStep(2)
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOtp = async (e) => {
        e.preventDefault()
        if (!canVerifyOtp) return
        setLoading(true)
        try {
            localStorage.removeItem(ACCESS_TOKEN_KEY)
            localStorage.removeItem(REFRESH_TOKEN_KEY)
            localStorage.removeItem('accesstoken')
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('refreshtoken')
            localStorage.removeItem('persist:root')
            localStorage.removeItem('user')

            const response = await Axios({
                ...SummaryApi.verifyOtp,
                data: {
                    email: data.email,
                    otp: data.otp,
                    name: data.name
                }
            })

            if (response.data.error) {
                toast.error(response.data.message)
                return
            }

            if (response.data.success) {
                toast.success(response.data.message || 'Login successful')

                const token   = response.data?.data?.accessToken  || response.data?.data?.accesstoken
                const refresh = response.data?.data?.refreshToken || response.data?.data?.refreshtoken

                if (token) {
                    await secureStorage.setItem('accessToken', token)
                }
                if (refresh) {
                    await secureStorage.setItem('refreshToken', refresh)
                }

                const userDetails = await fetchUserDetails()
                if (userDetails?.success && userDetails.data) {
                    dispatch(setUserDetails(userDetails.data))
                }

                setTimeout(() => navigate('/'), 100)
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    const handleResendOtp = async () => {
        setLoading(true)
        try {
            const response = await Axios({
                ...SummaryApi.sendOtp,
                data: { email: data.email }
            })
            if (response.data.error) {
                toast.error(response.data.message)
            } else {
                toast.success('OTP resent')
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className='w-full container mx-auto px-2'>
            <div className='bg-white my-8 w-full max-w-lg mx-auto rounded-xl shadow-lg p-8 border border-neutral-100'>
                <div className='text-center mb-6'>
                    <h2 className='text-2xl font-black text-slate-800'>Welcome to Snapit</h2>
                    <p className='text-slate-500 text-sm'>Fastest delivery in your locality</p>
                </div>

                {step === 1 && (
                    <form className='grid gap-4' onSubmit={handleSendOtp}>
                        <div className='grid gap-1'>
                            <label htmlFor='name' className='font-bold text-sm text-slate-700'>Name :</label>
                            <input
                                type='text'
                                id='name'
                                autoFocus
                                className='bg-blue-50 p-2.5 border rounded-lg outline-none focus:border-green-600 transition-all'
                                name='name'
                                value={data.name}
                                onChange={handleChange}
                                placeholder='Enter your name'
                            />
                        </div>
                        <div className='grid gap-1'>
                            <label htmlFor='email' className='font-bold text-sm text-slate-700'>Email :</label>
                            <input
                                type='email'
                                id='email'
                                className='bg-blue-50 p-2.5 border rounded-lg outline-none focus:border-green-600 transition-all'
                                name='email'
                                value={data.email}
                                onChange={handleChange}
                                placeholder='Enter your email'
                            />
                        </div>

                        <div className='grid gap-1'>
                            <label htmlFor='referralCode' className='font-bold text-sm text-slate-700'>Referral Code (Optional) :</label>
                            <input
                                type='text'
                                id='referralCode'
                                className='bg-green-50 p-2.5 border border-green-100 rounded-lg outline-none focus:border-green-600 font-mono text-green-800 transition-all'
                                name='referralCode'
                                value={data.referralCode}
                                onChange={handleChange}
                                placeholder='Have a code? Enter it here'
                            />
                            {refCode && <p className='text-[10px] text-green-600 font-bold italic'>✨ Referral code applied from link!</p>}
                        </div>

                        <button
                            disabled={!canSendOtp || loading}
                            className={`py-3 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 my-3 tracking-wider uppercase text-sm ${canSendOtp && !loading ? "bg-green-700 hover:bg-green-800 shadow-green-100" : "bg-slate-300 cursor-not-allowed"}`}
                        >
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form className='grid gap-4' onSubmit={handleVerifyOtp}>
                        <p className='text-center text-sm text-slate-600'>
                            We sent a 6-digit code to <span className='font-bold'>{data.email}</span>
                        </p>
                        <div className='grid gap-1'>
                            <label htmlFor='otp' className='font-bold text-sm text-slate-700'>Enter OTP :</label>
                            <input
                                type='text'
                                id='otp'
                                autoFocus
                                inputMode='numeric'
                                maxLength={6}
                                className='bg-blue-50 p-2.5 border rounded-lg outline-none focus:border-green-600 transition-all text-center text-2xl font-black tracking-[0.5em]'
                                name='otp'
                                value={data.otp}
                                onChange={handleChange}
                                placeholder='______'
                            />
                        </div>

                        <button
                            disabled={!canVerifyOtp || loading}
                            className={`py-3 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 my-3 tracking-wider uppercase text-sm ${canVerifyOtp && !loading ? "bg-green-700 hover:bg-green-800 shadow-green-100" : "bg-slate-300 cursor-not-allowed"}`}
                        >
                            {loading ? 'Verifying...' : 'Verify & Continue'}
                        </button>

                        <div className='flex justify-between text-sm'>
                            <button type='button' onClick={() => setStep(1)} className='text-slate-500 hover:underline'>
                                &larr; Change email
                            </button>
                            <button type='button' onClick={handleResendOtp} disabled={loading} className='text-green-700 font-bold hover:underline'>
                                Resend OTP
                            </button>
                        </div>
                    </form>
                )}

                <p className='text-center text-slate-600 text-sm mt-4'>
                    Already have account? <Link to={"/login"} className='font-black text-green-700 hover:underline'>Login</Link>
                </p>
            </div>
        </section>
    )
}

export default RegisterOtp
