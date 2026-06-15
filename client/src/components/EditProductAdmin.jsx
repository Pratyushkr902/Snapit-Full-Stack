import React, { useEffect, useState } from 'react'
import { IoClose } from 'react-icons/io5'
import uploadImage from '../utils/UploadImage' 
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import Loading from './Loading' 

const EditProductAdmin = ({ data, close, fetchProductData }) => {
    const [productData, setProductData] = useState({
        _id: data?._id,
        name: data?.name,
        image: data?.image || [],
        category: data?.category ? data.category.map(c => c._id || c) : [], 
        subCategory: data?.subCategory ? data.subCategory.map(s => s._id || s) : [],
        unit: data?.unit,
        stock: data?.stock,
        sellerPrice: data?.sellerPrice ?? '',
        snapitMargin: data?.snapitMargin ?? '',
        discount: data?.discount ?? '',
        description: data?.description,
        variantGroup: data?.variantGroup || '',
    })
    const [imageLoading, setImageLoading] = useState(false)

    useEffect(() => {
        setProductData({
            _id: data?._id,
            name: data?.name,
            image: data?.image || [],
            category: data?.category ? data.category.map(c => c._id || c) : [], 
            subCategory: data?.subCategory ? data.subCategory.map(s => s._id || s) : [],
            unit: data?.unit,
            stock: data?.stock,
            sellerPrice: data?.sellerPrice ?? '',
            snapitMargin: data?.snapitMargin ?? '',
            discount: data?.discount ?? '',
            description: data?.description,
            variantGroup: data?.variantGroup || '',
        })
    }, [data])

    const sellingPrice = Number(productData.sellerPrice || 0) + Number(productData.snapitMargin || 0)

    const handleOnChange = (e) => {
        const { name, value } = e.target
        const numericFields = ['sellerPrice', 'snapitMargin', 'discount', 'stock']
        setProductData((prev) => ({
            ...prev,
            [name]: numericFields.includes(name) ? (value === '' ? '' : Number(value)) : value
        }))
    }

    const handleUploadImage = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setImageLoading(true)
        try {
            const response = await uploadImage(file)
            const { data: responseData } = response
            const imageUrl = responseData?.data?.url || responseData?.url
            if(imageUrl){
                setProductData((prev) => ({ ...prev, image: [...prev.image, imageUrl] }))
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setImageLoading(false)
        }
    }

    const handleRemoveImage = (index) => {
        const updatedImages = [...productData.image]
        updatedImages.splice(index, 1)
        setProductData((prev) => ({ ...prev, image: updatedImages }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const resolvedSellerPrice  = Number(productData.sellerPrice)  || 0
        const resolvedMargin       = Number(productData.snapitMargin) || 0
        const resolvedSellingPrice = resolvedSellerPrice + resolvedMargin

        const payload = {
            ...productData,
            sellerPrice  : resolvedSellerPrice,
            snapitMargin : resolvedMargin,
            sellingPrice : resolvedSellingPrice,
            price        : resolvedSellingPrice,
        }

        try {
            const response = await Axios({ ...SummaryApi.updateProductDetails, data: payload })
            const { data: responseData } = response
            if (responseData.success) {
                toast.success(responseData.message)
                if (fetchProductData) fetchProductData()
                if (close) close()
            } else {
                toast.error(responseData.message || "Backend rejected the update")
            }
        } catch (error) {
            AxiosToastError(error)
        }
    }

    const handleImgError = (e) => {
        e.target.onerror = null
        e.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1773599668/Aashirvaad_Superior_MP_Whole_Wheat_Atta_z8tqsf.jpg"
    }

    return (
        <section className='fixed top-0 right-0 bottom-0 left-0 bg-neutral-800 bg-opacity-70 z-50 flex items-center justify-center p-4' onClick={close}>
            <div className='bg-white w-full max-w-2xl p-4 rounded-md overflow-y-auto max-h-[90vh] shadow-xl' onClick={(e) => e.stopPropagation()}>
                <div className='flex items-center justify-between pb-4 border-b'>
                    <h2 className='font-bold text-lg'>Edit Product</h2>
                    <button type="button" onClick={close} className='hover:text-red-600 transition-colors p-1 cursor-pointer'>
                        <IoClose size={25} />
                    </button>
                </div>

                <form className='grid gap-4 py-4' onSubmit={handleSubmit}>
                    <div className='grid gap-1'>
                        <p className='font-medium'>Product Images</p>
                        <div className='flex flex-wrap gap-3'>
                            {productData.image.map((img, index) => (
                                <div key={img + index} className='relative w-20 h-20 bg-blue-50 border rounded p-1 group'>
                                    <img src={img} alt={`product-${index}`} onError={handleImgError} className='w-full h-full object-scale-down'/>
                                    <button type="button" onClick={() => handleRemoveImage(index)} className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full cursor-pointer flex items-center justify-center p-0.5'>
                                        <IoClose size={14} />
                                    </button>
                                </div>
                            ))}
                            <label htmlFor='upload-image' className='w-20 h-20 bg-blue-50 border border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-blue-100'>
                                {imageLoading ? <Loading /> : <p className='text-xs text-neutral-500'>Upload</p>}
                                <input type='file' id='upload-image' className='hidden' onChange={handleUploadImage}/>
                            </label>
                        </div>
                    </div>

                    <div className='grid gap-1'>
                        <label htmlFor='name' className='font-medium'>Name</label>
                        <input id='name' name='name' value={productData.name} onChange={handleOnChange} className='bg-blue-50 p-2 border outline-none focus-within:border-primary-200 rounded' required/>
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <div className='grid gap-1'>
                            <label htmlFor='unit' className='font-medium'>Unit</label>
                            <input id='unit' name='unit' value={productData.unit} onChange={handleOnChange} className='bg-blue-50 p-2 border outline-none rounded'/>
                        </div>
                        <div className='grid gap-1'>
                            <label htmlFor='stock' className='font-medium'>Stock</label>
                            <input id='stock' name='stock' type='number' value={productData.stock} onChange={handleOnChange} className='bg-blue-50 p-2 border outline-none rounded'/>
                        </div>
                    </div>

                    <div className='bg-green-50 border border-green-200 rounded-xl p-4 grid gap-3'>
                        <p className='font-bold text-green-800 text-sm uppercase tracking-wider'>💰 Pricing</p>
                        <div className='grid gap-1'>
                            <label htmlFor='sellerPrice' className='font-medium text-sm'>Seller Price <span className='text-xs text-slate-400 font-normal'>(what seller earns)</span></label>
                            <div className='relative'>
                                <span className='absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500'>₹</span>
                                <input id='sellerPrice' name='sellerPrice' type='number' placeholder='e.g. 200' value={productData.sellerPrice} onChange={handleOnChange} className='bg-white pl-7 p-2 w-full outline-none border focus-within:border-green-400 rounded'/>
                            </div>
                        </div>
                        <div className='grid gap-1'>
                            <label htmlFor='snapitMargin' className='font-medium text-sm'>Snapit Margin <span className='text-xs text-slate-400 font-normal'>(your profit added on top)</span></label>
                            <div className='relative'>
                                <span className='absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500'>₹</span>
                                <input id='snapitMargin' name='snapitMargin' type='number' placeholder='e.g. 10' value={productData.snapitMargin} onChange={handleOnChange} className='bg-white pl-7 p-2 w-full outline-none border focus-within:border-green-400 rounded'/>
                            </div>
                        </div>
                        <div className='grid gap-1'>
                            <label className='font-medium text-sm'>Customer Pays (MRP) <span className='text-xs text-slate-400 font-normal'>(auto-calculated)</span></label>
                            <div className='bg-white border-2 border-green-400 rounded p-2 flex items-center justify-between'>
                                <span className='text-2xl font-black text-green-700'>₹{sellingPrice.toFixed(2)}</span>
                                <div className='text-right text-xs text-slate-500'>
                                    <p>₹{productData.sellerPrice || 0} seller + ₹{productData.snapitMargin || 0} margin</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='grid gap-1'>
                        <label htmlFor='discount' className='font-medium'>Discount %</label>
                        <input id='discount' name='discount' type='number' placeholder='Enter discount %' value={productData.discount} onChange={handleOnChange} className='bg-blue-50 p-2 border outline-none rounded'/>
                    </div>

                    <div className='grid gap-1'>
                        <label htmlFor='description' className='font-medium'>Description</label>
                        <textarea id='description' name='description' rows={3} value={productData.description} onChange={handleOnChange} className='bg-blue-50 p-2 border outline-none rounded resize-none'/>
                    </div>

                    <div className='grid gap-1'>
                        <label htmlFor='variantGroup' className='font-medium'>Variant Group <span className='text-gray-400 font-normal text-xs'>(optional)</span></label>
                        <input id='variantGroup' name='variantGroup' value={productData.variantGroup} onChange={handleOnChange} placeholder='e.g. lays-classic or amul-butter' className='bg-blue-50 p-2 border outline-none rounded'/>
                        <p className='text-[11px] text-gray-400'>Give the same group name to all size variants of this product so they appear as size pills on the product page.</p>
                    </div>
                    
                    <button type="submit" disabled={imageLoading} className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded mt-2 transition-all active:scale-95 ${imageLoading ? "opacity-50 cursor-not-allowed" : ""}`}>
                        {imageLoading ? "Uploading..." : "Update Product"}
                    </button>
                </form>
            </div>
        </section>
    )
}

export default EditProductAdmin
