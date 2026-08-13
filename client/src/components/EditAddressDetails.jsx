import React, { useState } from 'react'
import { useForm } from "react-hook-form"
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { IoClose, IoLocationSharp } from "react-icons/io5"
import { useGlobalContext } from '../provider/GlobalProvider'
import { getUserLocation } from '../utils/serviceArea'

const EditAddressDetails = ({ close, data }) => {
    const { register, handleSubmit, reset } = useForm({
        defaultValues : {
            _id          : data._id,
            userId       : data.userId,
            address_line : data.address_line,
            city         : data.city,
            state        : data.state,
            country      : data.country,
            pincode      : data.pincode,
            mobile       : data.mobile,
        }
    })
    const { fetchAddress } = useGlobalContext() || {}
    const [locating, setLocating] = useState(false)
    // Pre-fill with existing saved coords if available
    const [coords, setCoords] = useState({
        lat : data.lat || null,
        lng : data.lng || null,
    })

    const handleDetectLocation = async () => {
        setLocating(true)
        try {
            const { lat, lng } = await getUserLocation()
            setCoords({ lat, lng })
            toast.success('📍 Location pinned!')
        } catch {
            toast.error('Could not detect location.')
        } finally {
            setLocating(false)
        }
    }

    const onSubmit = async (formData) => {
        try {
            const response = await Axios({
                ...SummaryApi.updateAddress,
                data : {
                    _id          : formData._id,
                    address_line : formData.address_line,
                    city         : formData.city,
                    state        : formData.state,
                    country      : formData.country,
                    pincode      : formData.pincode,
                    mobile       : formData.mobile,
                    lat          : coords.lat,
                    lng          : coords.lng,
                }
            })

            const { data : responseData } = response

            if (responseData.success) {
                toast.success(responseData.message)
                if (close) {
                    close()
                    reset()
                    fetchAddress()
                }
            }
        } catch (error) {
            AxiosToastError(error)
        }
    }

    return (
        <section className='bg-black fixed top-0 left-0 right-0 bottom-0 z-50 bg-opacity-70 h-screen overflow-auto'>
            <div className='bg-white p-4 w-full max-w-lg mt-8 mx-auto rounded'>
                <div className='flex justify-between items-center gap-4'>
                    <h2 className='font-semibold'>Edit Address</h2>
                    <button onClick={close} className='hover:text-red-500'>
                        <IoClose size={25} />
                    </button>
                </div>

                {/* GPS Pin Button */}
                <button
                    type='button'
                    onClick={handleDetectLocation}
                    disabled={locating}
                    className='mt-3 w-full flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 border-2 border-green-200 text-green-700 font-bold py-2.5 rounded-xl transition-all active:scale-95'
                >
                    <IoLocationSharp size={16} />
                    {locating ? 'Detecting...' : coords.lat ? '📍 GPS Saved — Update Pin' : 'Pin My Exact Location'}
                </button>
                {coords.lat && (
                    <p className='text-xs text-green-600 text-center mt-1 mb-1'>
                        GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </p>
                )}

                <form className='mt-4 grid gap-4' onSubmit={handleSubmit(onSubmit)}>
                    <div className='grid gap-1'>
                        <label htmlFor='addressline'>Address Line :</label>
                        <input
                            type='text'
                            id='addressline'
                            className='border bg-blue-50 p-2 rounded'
                            {...register("address_line", { required: true })}
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='city'>City :</label>
                        <input
                            type='text'
                            id='city'
                            className='border bg-blue-50 p-2 rounded'
                            {...register("city", { required: true })}
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='state'>State :</label>
                        <input
                            type='text'
                            id='state'
                            className='border bg-blue-50 p-2 rounded'
                            {...register("state", { required: true })}
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='pincode'>Pincode :</label>
                        <input
                            type='text'
                            id='pincode'
                            className='border bg-blue-50 p-2 rounded'
                            {...register("pincode", { required: true })}
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='country'>Country :</label>
                        <input
                            type='text'
                            id='country'
                            className='border bg-blue-50 p-2 rounded'
                            {...register("country", { required: true })}
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='mobile'>Mobile No. :</label>
                        <input
                            type='text'
                            id='mobile'
                            className='border bg-blue-50 p-2 rounded'
                            {...register("mobile", { required: true })}
                        />
                    </div>

                    <button type='submit' className='bg-primary-200 w-full py-2 font-semibold mt-4 hover:bg-primary-100'>
                        Submit
                    </button>
                </form>
            </div>
        </section>
    )
}

export default EditAddressDetails