import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaRegUserCircle } from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";
import UserProfileAvatarEdit from '../components/UserProfileAvatarEdit';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import toast from 'react-hot-toast';
import { setUserDetails } from '../store/userSlice';
import fetchUserDetails from '../utils/fetchUserDetails';
import CampusAmbassadorCard from '../components/CampusAmbassadorCard';

const Profile = () => {
    const user     = useSelector(state => state.user)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const [openProfileAvatarEdit, setProfileAvatarEdit] = useState(false)
    const [userData, setUserData] = useState({
        name:   user.name,
        email:  user.email,
        mobile: user.mobile,
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setUserData({ name: user.name, email: user.email, mobile: user.mobile })
    }, [user])

    const handleOnChange = (e) => {
        const { name, value } = e.target
        setUserData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            const response = await Axios({ ...SummaryApi.updateUserDetails, data: userData })
            const { data: responseData } = response
            if (responseData.success) {
                toast.success(responseData.message)
                const userData = await fetchUserDetails()
                dispatch(setUserDetails(userData.data))
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='p-4'>

            {/* ── Back Button ── */}
            <button
                onClick={() => navigate(-1)}
                className='flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 mb-4 transition-colors'
            >
                <IoArrowBack size={18} />
                <span className='font-medium'>Back</span>
            </button>

            {/* Profile Avatar */}
            <div className='w-20 h-20 bg-red-500 flex items-center justify-center rounded-full overflow-hidden drop-shadow-sm'>
                {user.avatar ? (
                    <img alt={user.name} src={user.avatar} className='w-full h-full' />
                ) : (
                    <FaRegUserCircle size={65} />
                )}
            </div>
            <button
                onClick={() => setProfileAvatarEdit(true)}
                className='text-sm min-w-20 border border-primary-100 hover:border-primary-200 hover:bg-primary-200 px-3 py-1 rounded-full mt-3'
            >
                Edit
            </button>

            {openProfileAvatarEdit && (
                <UserProfileAvatarEdit close={() => setProfileAvatarEdit(false)} />

            )}

            <CampusAmbassadorCard campusAmbassador={user.campusAmbassador} />

            {/* Form */}
            <form className='my-4 grid gap-4' onSubmit={handleSubmit}>
                <div className='grid'>
                    <label>Name</label>
                    <input type='text' placeholder='Enter your name'
                        className='p-2 bg-blue-50 outline-none border focus-within:border-primary-200 rounded'
                        value={userData.name} name='name' onChange={handleOnChange} required />
                </div>
                <div className='grid'>
                    <label htmlFor='email'>Email</label>
                    <input type='email' id='email' placeholder='Enter your email'
                        className='p-2 bg-blue-50 outline-none border focus-within:border-primary-200 rounded'
                        value={userData.email} name='email' onChange={handleOnChange} required />
                </div>
                <div className='grid'>
                    <label htmlFor='mobile'>Mobile</label>
                    <input type='text' id='mobile' placeholder='Enter your mobile'
                        className='p-2 bg-blue-50 outline-none border focus-within:border-primary-200 rounded'
                        value={userData.mobile} name='mobile' onChange={handleOnChange} required />
                </div>
                <button className='border px-4 py-2 font-semibold hover:bg-primary-100 border-primary-100 text-primary-200 hover:text-neutral-800 rounded'>
                    {loading ? "Loading..." : "Submit"}
                </button>
            </form>

            {/* Notification Test Utility */}
            <div className='my-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm'>
                <div className='flex items-center justify-between gap-3'>
                    <div>
                        <h4 className='font-bold text-sm text-emerald-950 flex items-center gap-1.5'>
                            <span>🔔</span> Push Notifications Test
                        </h4>
                        <p className='text-xs text-emerald-700 mt-0.5'>
                            Send a live test notification to verify delivery on this device.
                        </p>
                    </div>
                    <button
                        type='button'
                        onClick={async () => {
                            try {
                                toast.loading('Sending test alert...', { id: 'test-push' })
                                const res = await Axios({ ...SummaryApi.testPushNotification })
                                if (res.data?.success) {
                                    toast.success(res.data.message || 'Notification dispatched!', { id: 'test-push' })
                                } else {
                                    toast.error(res.data?.message || 'Failed to dispatch test notification.', { id: 'test-push' })
                                }
                            } catch (err) {
                                toast.error(err?.response?.data?.message || err.message, { id: 'test-push' })
                            }
                        }}
                        className='px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex-shrink-0'
                    >
                        Test Push 📲
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Profile