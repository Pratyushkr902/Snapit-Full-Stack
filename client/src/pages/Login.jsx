import React, { useState } from 'react'
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa6"
import { FaGoogle, FaFacebook, FaBolt } from "react-icons/fa"
import { MdEmail, MdLock } from "react-icons/md"
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setUserDetails } from '../store/userSlice'
import fetchUserDetails from '../utils/fetchUserDetails'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants/storageKeys'

const Login = () => {
    const [data, setData] = useState({ email: "", password: "" })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target
        setData((prev) => ({ ...prev, [name]: value }))
    }

    const isValidValue = data.email.trim() !== "" && data.password.trim() !== ""

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isValidValue) return
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

            const response = await Axios({ ...SummaryApi.login, data })

            if (response.data.error) {
                toast.error(response.data.message)
                return
            }

            if (response.data.success) {
                toast.success(response.data.message)

                const token   = response.data?.data?.accessToken  || response.data?.data?.accesstoken
                const refresh = response.data?.data?.refreshToken || response.data?.data?.refreshtoken

                if (token) {
                    localStorage.setItem('accessToken', token)
                    localStorage.setItem('accesstoken', token)
                    localStorage.setItem(ACCESS_TOKEN_KEY, token)
                }
                if (refresh) {
                    localStorage.setItem('refreshToken', refresh)
                    localStorage.setItem('refreshtoken', refresh)
                    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
                }

                const userDetails = await fetchUserDetails()
                if (userDetails?.success && userDetails.data) {
                    dispatch(setUserDetails(userDetails.data))
                }

                setData({ email: "", password: "" })
                setTimeout(() => navigate("/"), 100)
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">

                {/* Card */}
                <div className="bg-white rounded-2xl border border-green-100 p-8 shadow-sm">

                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-7">
                        {/* ✅ Snapit logo replaces the green cart icon */}
                        <img
                            src="/logo.png"
                            alt="Snapit logo"
                            className="w-11 h-11 object-contain flex-shrink-0"
                        />
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900 leading-tight">Snapit</h1>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-800 bg-green-100 rounded-full px-2.5 py-0.5 mt-0.5">
                                <FaBolt className="text-[10px]" />
                                Instant grocery delivery
                            </span>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Welcome back</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1.5">
                                Email address
                            </label>
                            <div className="flex items-center bg-green-50 border-[1.5px] border-green-200 rounded-xl px-3 h-12 focus-within:border-green-700 focus-within:bg-white transition-all">
                                <MdEmail className="text-green-600 text-lg mr-2.5 flex-shrink-0" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={data.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1.5">
                                Password
                            </label>
                            <div className="flex items-center bg-green-50 border-[1.5px] border-green-200 rounded-xl px-3 h-12 focus-within:border-green-700 focus-within:bg-white transition-all">
                                <MdEmail className="text-green-600 text-lg mr-2.5 flex-shrink-0" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={data.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="text-green-600 hover:text-green-800 ml-2 focus:outline-none transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <FaRegEye className="text-base" /> : <FaRegEyeSlash className="text-base" />}
                                </button>
                            </div>
                            <div className="text-right mt-1.5">
                                <Link to="/forgot-password" className="text-xs text-green-700 hover:text-green-900 font-medium transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={!isValidValue || loading}
                            className={`w-full h-12 rounded-xl text-sm font-semibold tracking-wide transition-all
                                ${isValidValue && !loading
                                    ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] text-white cursor-pointer'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <hr className="flex-1 border-t border-gray-100" />
                        <span className="text-xs text-gray-400">or continue with</span>
                        <hr className="flex-1 border-t border-gray-100" />
                    </div>

                    {/* Social */}
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all">
                            <FaGoogle className="text-base text-[#4285F4]" />
                            Google
                        </button>
                        <button className="flex items-center justify-center gap-2 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all">
                            <FaFacebook className="text-base text-[#1877F2]" />
                            Facebook
                        </button>
                    </div>

                    {/* Register */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        New to Snapit?{' '}
                        <Link to="/register" className="text-green-700 hover:text-green-900 font-semibold transition-colors">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}

export default Login