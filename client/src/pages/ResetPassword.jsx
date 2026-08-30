import React, { useEffect, useState } from 'react'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6'
import { IoArrowBack, IoLockClosedOutline } from 'react-icons/io5'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'

const ResetPassword = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isValidValue = Boolean(
    data.email &&
    data.newPassword.trim().length >= 6 &&
    data.confirmPassword.trim().length >= 6
  )

  useEffect(() => {
    if (location?.state?.email) {
      setData((prev) => ({
        ...prev,
        email: location.state.email
      }))
    } else {
      const searchParams = new URLSearchParams(location.search)
      const emailParam = searchParams.get('email')
      
      if (emailParam) {
        setData((prev) => ({
          ...prev,
          email: emailParam
        }))
      } else if (!(location?.state?.data?.success)) {
        toast.error("Please verify your email first.")
        navigate("/forgot-password")
      }
    }
  }, [location, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidValue || loading) return

    if (data.newPassword !== data.confirmPassword) {
      toast.error("New password and confirm password must match.")
      return
    }

    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.resetPassword,
        data: {
          email: data.email.trim().toLowerCase(),
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword
        }
      })
      
      if (response.data.error) {
        toast.error(response.data.message)
      }

      if (response.data.success) {
        toast.success(response.data.message || "Password updated successfully!")
        setData({
          email: "",
          newPassword: "",
          confirmPassword: ""
        })
        navigate("/login")
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
            onClick={() => navigate("/login")}
            className='w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition'
            aria-label="Back"
          >
            <IoArrowBack size={18} />
          </button>
          <div>
            <h1 className='font-black text-xl text-slate-900 leading-tight'>Set New Password</h1>
            {data.email && (
              <p className='text-xs text-slate-500'>
                For <span className='font-semibold text-slate-700'>{data.email}</span>
              </p>
            )}
          </div>
        </div>

        <form className='grid gap-4 py-2' onSubmit={handleSubmit}>
          <div className='grid gap-1.5'>
            <label htmlFor='newPassword' className='text-xs font-bold text-slate-700 uppercase tracking-wider'>
              New Password :
            </label>
            <div className='bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 flex items-center focus-within:border-emerald-600 focus-within:bg-white transition-all'>
              <IoLockClosedOutline className='text-slate-400 text-lg mr-2 flex-shrink-0' />
              <input
                type={showPassword ? "text" : "password"}
                id='newPassword'
                className='w-full bg-transparent outline-none text-sm text-slate-800 font-medium'
                name='newPassword'
                value={data.newPassword}
                onChange={handleChange}
                placeholder='Minimum 6 characters'
                required
                autoFocus
              />
              <button
                type='button'
                onClick={() => setShowPassword(prev => !prev)}
                className='cursor-pointer text-slate-400 hover:text-slate-600 px-1 focus:outline-none'
              >
                {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
              </button>
            </div>
          </div>

          <div className='grid gap-1.5'>
            <label htmlFor='confirmPassword' className='text-xs font-bold text-slate-700 uppercase tracking-wider'>
              Confirm Password :
            </label>
            <div className='bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 flex items-center focus-within:border-emerald-600 focus-within:bg-white transition-all'>
              <IoLockClosedOutline className='text-slate-400 text-lg mr-2 flex-shrink-0' />
              <input
                type={showConfirmPassword ? "text" : "password"}
                id='confirmPassword'
                className='w-full bg-transparent outline-none text-sm text-slate-800 font-medium'
                name='confirmPassword'
                value={data.confirmPassword}
                onChange={handleChange}
                placeholder='Re-type new password'
                required
              />
              <button
                type='button'
                onClick={() => setShowConfirmPassword(prev => !prev)}
                className='cursor-pointer text-slate-400 hover:text-slate-600 px-1 focus:outline-none'
              >
                {showConfirmPassword ? <FaRegEye /> : <FaRegEyeSlash />}
              </button>
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
                <span>Updating Password...</span>
              </>
            ) : (
              "Save New Password"
            )}
          </button>
        </form>

        <p className='text-center text-xs text-slate-500 mt-6'>
          Remember your credentials? <Link to={"/login"} className='font-bold text-emerald-600 hover:text-emerald-700 underline ml-1'>Login</Link>
        </p>
      </div>
    </section>
  )
}

export default ResetPassword