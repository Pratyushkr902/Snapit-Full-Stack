import React, { useState } from 'react'
import { IoClose } from "react-icons/io5";
import uploadImage from '../utils/UploadImage'; // Adjust path if needed
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import AxiosToastError from '../utils/AxiosToastError';
import { useSelector } from 'react-redux';

const EditSubCategory = ({ close, data, fetchData }) => {
    const [subCategoryData, setSubCategoryData] = useState({
        _id: data._id,
        name: data.name,
        image: data.image,
        category: data.category || []
    })
    const allCategory = useSelector(state => state.product.allCategory)
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setSubCategoryData((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    const handleUploadImage = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setLoading(true)
        const response = await uploadImage(file)
        const { data: ImageResponse } = response
        setLoading(false)

        setSubCategoryData((prev) => ({
            ...prev,
            image: ImageResponse.data.url
        }))
    }

    const handleRemoveCategorySelected = (categoryId) => {
        const index = subCategoryData.category.findIndex(el => el._id === categoryId)
        subCategoryData.category.splice(index, 1)
        setSubCategoryData((prev) => ({
            ...prev
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.updateSubCategory,
                data: subCategoryData
            })
            const { data: responseData } = response
            if (responseData.success) {
                toast.success(responseData.message)
                if (close) close()
                if (fetchData) fetchData()
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className='fixed top-0 right-0 bottom-0 left-0 bg-neutral-800 bg-opacity-70 z-50 flex items-center justify-center p-4'>
            <div className='w-full max-w-5xl bg-white p-4 rounded'>
                <div className='flex items-center justify-between'>
                    <h1 className='font-semibold'>Edit Sub Category</h1>
                    <button onClick={close}>
                        <IoClose size={25} />
                    </button>
                </div>

                <form className='my-4 grid gap-3' onSubmit={handleSubmit}>
                    <div className='grid gap-1'>
                        <label htmlFor='name'>Name</label>
                        <input
                            id='name'
                            name='name'
                            value={subCategoryData.name}
                            onChange={handleChange}
                            className='bg-blue-50 p-2 border outline-none focus-within:border-primary-200 rounded'
                        />
                    </div>

                    <div className='grid gap-1'>
                        <p>Image</p>
                        <div className='flex flex-col lg:flex-row items-center gap-3'>
                            <div className='border h-36 w-full lg:w-36 bg-blue-50 flex items-center justify-center'>
                                {subCategoryData.image ? (
                                    <img src={subCategoryData.image} alt="subCategory" className='w-full h-full object-scale-down' />
                                ) : (
                                    <p className='text-sm text-neutral-400'>No Image</p>
                                )}
                            </div>
                            <label htmlFor='uploadSubCategoryImage' className='px-4 py-2 border border-primary-200 text-primary-200 rounded cursor-pointer'>
                                {loading ? "Uploading..." : "Upload Image"}
                                <input type='file' id='uploadSubCategoryImage' className='hidden' onChange={handleUploadImage} />
                            </label>
                        </div>
                    </div>

                    <div className='grid gap-1'>
                        <label>Select Category</label>
                        <select
                            className='bg-blue-50 p-2 border outline-none focus-within:border-primary-200 rounded'
                            onChange={(e) => {
                                const value = e.target.value
                                const categoryDetails = allCategory.find(el => el._id === value)
                                setSubCategoryData((prev) => ({
                                    ...prev,
                                    category: [...prev.category, categoryDetails]
                                }))
                            }}
                        >
                            <option value={""}>Select Category</option>
                            {allCategory.map((c, index) => (
                                <option value={c?._id} key={c._id + "editSubCategory"}>{c.name}</option>
                            ))}
                        </select>
                        <div className='flex flex-wrap gap-2'>
                            {subCategoryData.category.map((c, index) => (
                                <div key={c._id + "getSelected"} className='bg-white shadow-md px-2 py-1 rounded flex items-center gap-2'>
                                    {c.name}
                                    <div className='cursor-pointer hover:text-red-600' onClick={() => handleRemoveCategorySelected(c._id)}>
                                        <IoClose size={20} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        className={`px-4 py-2 bg-primary-200 font-semibold py-3 border 
                        ${subCategoryData.name && subCategoryData.image && subCategoryData.category[0] ? "bg-primary-200 hover:bg-primary-100" : "bg-gray-200 cursor-not-allowed"}
                        `}
                    >
                        Submit
                    </button>
                </form>
            </div>
        </section>
    )
}

export default EditSubCategory