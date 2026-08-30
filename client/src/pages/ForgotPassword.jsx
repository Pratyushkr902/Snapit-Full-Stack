import React, { useState } from 'react'
import { IoArrowBack, IoMailOutline } from "react-icons/io5";
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import { Link, useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
    const [data, setData] = useState({
        email: "",
    })
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target
        setData((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    const isValidValue = Boolean(data.email && data.email.trim())

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isValidValue || loading) return

        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.forgot_password,
                data: { email: data.email.trim().toLowerCase() }
            })
            
            if (response.data.error) {
                toast.error(response.data.message)
            }

            if (response.data.success) {
                toast.success(response.data.message || "OTP sent successfully!")
                navigate("/verification-otp", {
                    state: { email: data.email.trim().toLowerCase() }
                })
                setData({ email: "" })
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
                        onClick={() => navigate(-1)}
                        className='w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition'
                        aria-label="Back"
                    >
                        <IoArrowBack size={18} />
                    </button>
                    <div>
                        <h1 className='font-black text-xl text-slate-900 leading-tight'>Forgot Password</h1>
                        <p className='text-xs text-slate-500'>We'll send a 6-digit reset code to your email</p>
                    </div>
                </div>

                <form className='grid gap-4 py-2' onSubmit={handleSubmit}>
                    <div className='grid gap-1.5'>
                        <label htmlFor='email' className='text-xs font-bold text-slate-700 uppercase tracking-wider'>
                            Email Address :
                        </label>
                        <div className='flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 focus-within:border-emerald-600 focus-within:bg-white transition-all'>
                            <IoMailOutline className='text-slate-400 text-lg mr-2 flex-shrink-0' />
                            <input
                                type='email'
                                id='email'
                                className='w-full bg-transparent outline-none text-sm text-slate-800 font-medium'
                                name='email'
                                value={data.email}
                                onChange={handleChange}
                                placeholder='name@example.com'
                                required
                                autoFocus
                            />
                        </div>
                    </div>
             
                    <button 
                        type='submit'
                        disabled={!isValidValue || loading} 
                        className={`w-full py-3.5 rounded-2xl font-black text-sm text-white tracking-wide shadow-lg transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 ${
                            isValidValue && !loading
                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 cursor-pointer" 
                                : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                        }`}
                    >
                        {loading ? (
                            <>
                                <span className='w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin' />
                                <span>Sending Code...</span>
                            </>
                        ) : (
                            "Send Reset OTP"
                        )}
                    </button>
                </form>

                <p className='text-center text-xs text-slate-500 mt-6'>
                    Remember your password? <Link to={"/login"} className='font-bold text-emerald-600 hover:text-emerald-700 underline ml-1'>Login</Link>
                </p>
            </div>
        </section>
    )
}

export default ForgotPassword

