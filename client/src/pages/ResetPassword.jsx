import React, { useEffect, useState } from 'react'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi' // ✅ FIXED: Import from your core utilities folder
import AxiosToastError from '../utils/AxiosToastError'

const ResetPassword = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isValidValue = data.newPassword.trim() !== "" && data.confirmPassword.trim() !== "";

  useEffect(() => {
    // Check if email context came from internal router state redirect
    if (location?.state?.email) {
      setData((prev) => ({
        ...prev,
        email: location.state.email
      }))
    } else {
      // ✅ FALLBACK: Parse explicit email search queries out of URL links coming from external emails
      const searchParams = new URLSearchParams(location.search)
      const emailParam = searchParams.get('email')
      
      if (emailParam) {
        setData((prev) => ({
          ...prev,
          email: emailParam
        }))
      } else if (!(location?.state?.data?.success)) {
        // Only kick out to homepage if there is no internal state AND no URL recovery parameter present
        toast.error("Invalid or expired password reset link session.")
        navigate("/")
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

    if (data.newPassword !== data.confirmPassword) {
      toast.error("New password and confirm password must match.")
      return
    }

    try {
      const response = await Axios({
        ...SummaryApi.resetPassword, // ✅ FIXED: Match the backend lower-case mapping name
        data: data
      })
      
      if (response.data.error) {
        toast.error(response.data.message)
      }

      if (response.data.success) {
        toast.success(response.data.message)
        setData({
          email: "",
          newPassword: "",
          confirmPassword: ""
        })
        navigate("/login")
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  return (
    <section className='w-full container mx-auto px-2'>
      <div className='bg-white my-4 w-full max-w-lg mx-auto rounded p-7 shadow-sm'>
        <p className='font-semibold text-lg text-gray-800'>Enter Your New Password</p>
        
        {data.email && (
          <p className='text-sm text-gray-500 mt-1'>Resetting password for: <span className='font-medium text-gray-700'>{data.email}</span></p>
        )}

        <form className='grid gap-4 py-4' onSubmit={handleSubmit}>
          <div className='grid gap-1'>
            <label htmlFor='newPassword' className='font-medium text-gray-700'>New Password :</label>
            <div className='bg-blue-50 p-2 border rounded flex items-center focus-within:border-green-700 transition-all'>
              <input
                type={showPassword ? "text" : "password"}
                id='newPassword'
                className='w-full bg-transparent outline-none'
                name='newPassword'
                value={data.newPassword}
                onChange={handleChange}
                placeholder='Enter your new password'
                required
              />
              <button
                type='button'
                onClick={() => setShowPassword(prev => !prev)}
                className='cursor-pointer text-gray-500 hover:text-gray-700 px-1 focus:outline-none'
              >
                {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
              </button>
            </div>
          </div>

          <div className='grid gap-1'>
            <label htmlFor='confirmPassword' className='font-medium text-gray-700'>Confirm Password :</label>
            <div className='bg-blue-50 p-2 border rounded flex items-center focus-within:border-green-700 transition-all'>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id='confirmPassword'
                className='w-full bg-transparent outline-none'
                name='confirmPassword'
                value={data.confirmPassword}
                onChange={handleChange}
                placeholder='Enter your confirm password'
                required
              />
              <button
                type='button'
                onClick={() => setShowConfirmPassword(prev => !prev)}
                className='cursor-pointer text-gray-500 hover:text-gray-700 px-1 focus:outline-none'
              >
                {showConfirmPassword ? <FaRegEye /> : <FaRegEyeSlash />}
              </button>
            </div>
          </div>
   
          <button 
            disabled={!isValidValue} 
            className={`${isValidValue ? "bg-green-800 hover:bg-green-700 active:scale-[0.99]" : "bg-gray-400 cursor-not-allowed"} text-white py-2 rounded font-semibold my-3 tracking-wide transition-all`}
          >
            Change Password
          </button>
        </form>

        <p className='text-gray-600 text-center sm:text-left mt-2'>
          Already have an account? <Link to={"/login"} className='font-semibold text-green-700 hover:text-green-800 underline decoration-transparent hover:decoration-green-800 transition-all'>Login</Link>
        </p>
      </div>
    </section>
  )
}

export default ResetPassword