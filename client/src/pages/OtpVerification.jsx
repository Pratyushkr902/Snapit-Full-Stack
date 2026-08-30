import React, { useEffect, useRef, useState } from 'react'
import { IoArrowBack, IoShieldCheckmarkOutline } from 'react-icons/io5'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const OtpVerification = () => {
    const [data, setData] = useState(["", "", "", "", "", ""])
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const inputRef = useRef([])
    const location = useLocation()

    const email = location?.state?.email || ""

    useEffect(() => {
        if (!email) {
            navigate("/forgot-password")
        }
    }, [email, navigate])

    const isValidValue = data.every(el => el.trim() !== "")

    const handlePaste = (e) => {
        const paste = e.clipboardData.getData('text').trim()
        if (/^\d{6}$/.test(paste)) {
            e.preventDefault()
            const digits = paste.split('').slice(0, 6)
            setData(digits)
            inputRef.current[5]?.focus()
        }
    }

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !data[index] && index > 0) {
            inputRef.current[index - 1]?.focus()
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isValidValue || loading) return

        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.forgot_password_otp_verification,
                data: {
                    otp: data.join("").trim(),
                    email: email.trim().toLowerCase()
                }
            })
            
            if (response.data.error) {
                toast.error(response.data.message)
            }

            if (response.data.success) {
                toast.success(response.data.message || "OTP verified successfully!")
                setData(["", "", "", "", "", ""])
                navigate("/reset-password", {
                    state: {
                        data: response.data,
                        email: email.trim().toLowerCase()
                    }
                })
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className='w-full min-h-[85vh] flex items-center justify-center container mx-auto px-4 pt-safe pt-8 pb-16'>
            <div className='bg-white my-4 w-full max-w-md mx-auto rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100'>
                <div className='flex items-center gap-3 mb-4'>
                    <button
                        type='button'
                        onClick={() => navigate("/forgot-password")}
                        className='w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition'
                        aria-label="Back"
                    >
                        <IoArrowBack size={18} />
                    </button>
                    <div>
                        <h1 className='font-black text-xl text-slate-900 leading-tight'>Enter 6-Digit OTP</h1>
                        <p className='text-xs text-slate-500'>
                            Sent to <span className='font-semibold text-slate-700'>{email}</span>
                        </p>
                    </div>
                </div>

                <form className='grid gap-4 py-2' onSubmit={handleSubmit}>
                    <div className='grid gap-1.5'>
                        <label htmlFor='otp-0' className='text-xs font-bold text-slate-700 uppercase tracking-wider text-center'>
                            Verification Code
                        </label>
                        <div className='flex items-center gap-2 sm:gap-2.5 justify-between mt-2'>
                            {data.map((digit, index) => (
                                <input
                                    key={"otp" + index}
                                    type='tel'
                                    id={'otp-' + index}
                                    ref={(ref) => {
                                        inputRef.current[index] = ref
                                        return ref
                                    }}
                                    value={digit}
                                    onPaste={handlePaste}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(-1)
                                        const newData = [...data]
                                        newData[index] = val
                                        setData(newData)

                                        if (val && index < 5) {
                                            inputRef.current[index + 1]?.focus()
                                        }
                                    }}
                                    maxLength={1}
                                    autoFocus={index === 0}
                                    className='bg-slate-50 w-11 sm:w-12 h-12 sm:h-14 border border-slate-200 rounded-2xl outline-none focus:border-emerald-600 focus:bg-white text-center font-black text-lg sm:text-xl text-slate-900 shadow-xs transition-all'
                                />
                            ))}
                        </div>
                    </div>
             
                    <button 
                        type='submit'
                        disabled={!isValidValue || loading} 
                        className={`w-full py-3.5 rounded-2xl font-black text-sm text-white tracking-wide shadow-lg transition-all active:scale-[0.98] mt-3 flex items-center justify-center gap-2 ${
                            isValidValue && !loading
                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 cursor-pointer" 
                                : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                        }`}
                    >
                        {loading ? (
                            <>
                                <span className='w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin' />
                                <span>Verifying OTP...</span>
                            </>
                        ) : (
                            "Verify & Continue"
                        )}
                    </button>
                </form>

                <p className='text-center text-xs text-slate-500 mt-6'>
                    Didn't receive code?{' '}
                    <button
                        type='button'
                        onClick={() => navigate("/forgot-password")}
                        className='font-bold text-emerald-600 hover:text-emerald-700 underline ml-1 cursor-pointer'
                    >
                        Resend Code
                    </button>
                </p>
            </div>
        </section>
    )
}

export default OtpVerification


