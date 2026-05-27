import React, { useState } from 'react'
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa6";
import toast from 'react-hot-toast';
import Axios from '../utils/Axios'; 
import SummaryApi from '../common/SummaryApi'; // ✅ FIXED: Import directly from your core common constants directory
import AxiosToastError from '../utils/AxiosToastError';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUserDetails } from '../store/userSlice';
import fetchUserDetails from '../utils/fetchUserDetails';

const Login = () => {
    const [data, setData] = useState({
        email: "",
        password: "",
    })
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const handleChange = (e) => {
        const { name, value } = e.target
        setData((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    const isValidValue = data.email.trim() !== "" && data.password.trim() !== "";

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isValidValue) return

        try {
            localStorage.removeItem('accesstoken');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('refreshtoken');

            // This will now explicitly show up in your Network tab!
            const response = await Axios({
                ...SummaryApi.login,
                data: data
            })
            
            if (response.data.error) {
                toast.error(response.data.message)
                return;
            }

            if (response.data.success) {
                toast.success(response.data.message)
                
                const token = response.data?.data?.accesstoken || response.data?.data?.accessToken;
                const refresh = response.data?.data?.refreshToken || response.data?.data?.refreshtoken;

                if (token) {
                    localStorage.setItem('accesstoken', token)
                    localStorage.setItem('accessToken', token)
                }
                if (refresh) {
                    localStorage.setItem('refreshToken', refresh)
                    localStorage.setItem('refreshtoken', refresh)
                }

                // Hydrate Redux cleanly before shifting paths
                const userDetails = await fetchUserDetails()
                if (userDetails?.success) {
                    // ✅ FIXED: Target the backend's nested user payload object cleanly
                    const profileData = userDetails.data;
                    if (profileData) {
                        dispatch(setUserDetails(profileData))
                    }
                }

                setData({
                    email: "",
                    password: "",
                })
                
                navigate("/")
            }

        } catch (error) {
            AxiosToastError(error)
        }
    }

    return (
        <section className='w-full container mx-auto px-2'>
            <div className='bg-white my-4 w-full max-w-lg mx-auto rounded p-7 shadow-sm'>
                <form className='grid gap-4 py-4' onSubmit={handleSubmit}>
                    <div className='grid gap-1'>
                        <label htmlFor='email' className='font-medium text-gray-700'>Email :</label>
                        <input
                            type='email'
                            id='email'
                            className='bg-blue-50 p-2 border rounded outline-none focus:border-green-700 transition-all'
                            name='email'
                            value={data.email}
                            onChange={handleChange}
                            placeholder='Enter your email'
                            required
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='password' className='font-medium text-gray-700'>Password :</label>
                        <div className='bg-blue-50 p-2 border rounded flex items-center focus-within:border-green-700 transition-all'>
                            <input
                                type={showPassword ? "text" : "password"}
                                id='password'
                                className='w-full bg-transparent outline-none'
                                name='password'
                                value={data.password}
                                placeholder='Enter your password'
                                onChange={handleChange}
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)} 
                                className='cursor-pointer text-gray-500 hover:text-gray-700 focus:outline-none px-1'
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                            </button>
                        </div>
                        <Link to={"/forgot-password"} className='block ml-auto text-sm text-gray-600 hover:text-green-700 transition-colors'>
                            Forgot password ?
                        </Link>
                    </div>
    
                    <button 
                        disabled={!isValidValue} 
                        className={`${isValidValue ? "bg-green-800 hover:bg-green-700 active:scale-[0.99]" : "bg-gray-400 cursor-not-allowed"} text-white py-2 rounded font-semibold my-3 tracking-wide transition-all`}
                    >
                        Login
                    </button>
                </form>

                <p className='text-gray-600 text-center sm:text-left'>
                    Don't have an account? <Link to={"/register"} className='font-semibold text-green-700 hover:text-green-800 underline decoration-transparent hover:decoration-green-800 transition-all'>Register</Link>
                </p>
            </div>
        </section>
    )
}

export default Login;