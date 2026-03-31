import React, { useState } from 'react'
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa6";
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import { Link, useNavigate, useSearchParams } from 'react-router-dom'; // IMPORTED useSearchParams

const Register = () => {
    const [searchParams] = useSearchParams()
    const refCode = searchParams.get('ref') // Extracts ?ref=CODE from URL
    
    const [data, setData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        referralCode: refCode || "" // AUTO-FILLS from URL
    })

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target
        setData((preve) => {
            return {
                ...preve,
                [name]: value
            }
        })
    }

    // UPDATED: Ensure referralCode doesn't block the 'Register' button since it's optional
    const valideValue = data.name && data.email && data.password && data.confirmPassword

    const handleSubmit = async(e)=>{
        e.preventDefault()

        if(data.password !== data.confirmPassword){
            toast.error("Password and confirm password must be same")
            return
        }

        try {
            const response = await Axios({
                ...SummaryApi.register,
                data : data
            })
            
            if(response.data.error){
                toast.error(response.data.message)
            }

            if(response.data.success){
                toast.success(response.data.message)
                setData({
                    name : "",
                    email : "",
                    password : "",
                    confirmPassword : "",
                    referralCode: ""
                })
                navigate("/login")
            }

        } catch (error) {
            AxiosToastError(error)
        }
    }

    return (
        <section className='w-full container mx-auto px-2'>
            <div className='bg-white my-8 w-full max-w-lg mx-auto rounded-xl shadow-lg p-8 border border-neutral-100'>
                <div className='text-center mb-6'>
                    <h2 className='text-2xl font-black text-slate-800'>Welcome to Snapit</h2>
                    <p className='text-slate-500 text-sm'>Fastest delivery in your locality</p>
                </div>

                <form className='grid gap-4' onSubmit={handleSubmit}>
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

                    {/* REFERRAL CODE FIELD - Optional Branding */}
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

                    <div className='grid gap-1'>
                        <label htmlFor='password' class='font-bold text-sm text-slate-700'>Password :</label>
                        <div className='bg-blue-50 p-2.5 border rounded-lg flex items-center focus-within:border-green-600 transition-all'>
                            <input
                                type={showPassword ? "text" : "password"}
                                id='password'
                                className='w-full outline-none bg-transparent'
                                name='password'
                                value={data.password}
                                onChange={handleChange}
                                placeholder='Enter your password'
                            />
                            <div onClick={() => setShowPassword(preve => !preve)} className='cursor-pointer text-slate-500'>
                                {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                            </div>
                        </div>
                    </div>

                    <div className='grid gap-1'>
                        <label htmlFor='confirmPassword' class='font-bold text-sm text-slate-700'>Confirm Password :</label>
                        <div className='bg-blue-50 p-2.5 border rounded-lg flex items-center focus-within:border-green-600 transition-all'>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id='confirmPassword'
                                className='w-full outline-none bg-transparent'
                                name='confirmPassword'
                                value={data.confirmPassword}
                                onChange={handleChange}
                                placeholder='Enter your confirm password'
                            />
                            <div onClick={() => setShowConfirmPassword(preve => !preve)} className='cursor-pointer text-slate-500'>
                                {showConfirmPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                            </div>
                        </div>
                    </div>

                    <button 
                        disabled={!valideValue} 
                        className={`py-3 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 my-3 tracking-wider uppercase text-sm ${valideValue ? "bg-green-700 hover:bg-green-800 shadow-green-100" : "bg-slate-300 cursor-not-allowed"}`}
                    >
                        Create Account
                    </button>
                </form>

                <p className='text-center text-slate-600 text-sm'>
                    Already have account? <Link to={"/login"} className='font-black text-green-700 hover:underline'>Login</Link>
                </p>
            </div>
        </section>
    )
}

export default Register