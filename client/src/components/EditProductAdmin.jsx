import React, { useEffect, useState } from 'react'
import { IoClose } from 'react-icons/io5'
import uploadImage from '../utils/UploadImage' 
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import Loading from './Loading' 
import { useSelector } from 'react-redux'
import { optimizeImage } from '../utils/optimizeImage'

const EditProductAdmin = ({ data, close, fetchProductData }) => {
    const allCategory    = useSelector(state => state.product.allCategory)
    const allSubCategory = useSelector(state => state.product.allSubCategory)

    const [selectCategory, setSelectCategory]       = useState("")
    const [selectSubCategory, setSelectSubCategory] = useState("")

    const [productData, setProductData] = useState({
        _id: data?._id,
        name: data?.name,
        image: data?.image || [],
        category: data?.category ? data.category.map(c => ({ _id: c._id || c, name: c.name || '' })) : [],
        subCategory: data?.subCategory ? data.subCategory.map(s => ({ _id: s._id || s, name: s.name || '' })) : [],
        unit: data?.unit,
        stock: data?.stock,
        sellerPrice: (data?.sellerPrice !== undefined && data?.sellerPrice !== null && data?.sellerPrice !== '') ? Number(data.sellerPrice) : '',
        snapitMargin: (data?.snapitMargin !== undefined && data?.snapitMargin !== null && data?.snapitMargin !== '') ? Number(data.snapitMargin) : '',
        discount: (data?.discount !== undefined && data?.discount !== null && data?.discount !== '') ? Number(data.discount) : '',
        description: data?.description,
        variantGroup: data?.variantGroup || '',
    })
    const [imageLoading, setImageLoading] = useState(false)

    useEffect(() => {
        setProductData({
            _id: data?._id,
            name: data?.name,
            image: data?.image || [],
            category: data?.category ? data.category.map(c => ({ _id: c._id || c, name: c.name || '' })) : [],
            subCategory: data?.subCategory ? data.subCategory.map(s => ({ _id: s._id || s, name: s.name || '' })) : [],
            unit: data?.unit,
            stock: data?.stock,
            sellerPrice: (data?.sellerPrice !== undefined && data?.sellerPrice !== null && data?.sellerPrice !== '') ? Number(data.sellerPrice) : '',
            snapitMargin: (data?.snapitMargin !== undefined && data?.snapitMargin !== null && data?.snapitMargin !== '') ? Number(data.snapitMargin) : '',
            discount: (data?.discount !== undefined && data?.discount !== null && data?.discount !== '') ? Number(data.discount) : '',
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

    const handleAddCategory = (e) => {
        const value = e.target.value
        setSelectCategory(value)
        const category = allCategory.find(el => el._id === value)
        if (category && !productData.category.some(c => c._id === category._id)) {
            setProductData(prev => ({ ...prev, category: [...prev.category, { _id: category._id, name: category.name }] }))
        }
    }

    const handleRemoveCategory = (id) => {
        setProductData(prev => ({ ...prev, category: prev.category.filter(c => c._id !== id) }))
    }

    const handleAddSubCategory = (e) => {
        const value = e.target.value
        setSelectSubCategory(value)
        const subCategory = allSubCategory.find(el => el._id === value)
        if (subCategory && !productData.subCategory.some(s => s._id === subCategory._id)) {
            setProductData(prev => ({ ...prev, subCategory: [...prev.subCategory, { _id: subCategory._id, name: subCategory.name }] }))
        }
    }

    const handleRemoveSubCategory = (id) => {
        setProductData(prev => ({ ...prev, subCategory: prev.subCategory.filter(s => s._id !== id) }))
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

        const resolvedSellerPrice  = productData.sellerPrice !== '' ? Number(productData.sellerPrice)  : Number(data?.sellerPrice  ?? 0)
        const resolvedMargin       = productData.snapitMargin !== '' ? Number(productData.snapitMargin) : Number(data?.snapitMargin ?? 0)
        const resolvedSellingPrice = resolvedSellerPrice + resolvedMargin

        const payload = {
            ...productData,
            category     : productData.category.map(c => c._id),
            subCategory  : productData.subCategory.map(s => s._id),
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

    const fieldClass = 'bg-blue-50 p-2 border outline-none focus-within:border-primary-200 rounded w-full min-w-0 box-border'

    return (
        <section
            className='fixed inset-0 bg-neutral-800/70 z-50 flex items-start sm:items-center justify-center'
            onClick={close}
        >
            <div
                className='bg-white w-full sm:max-w-2xl sm:my-8 sm:rounded-md p-4 h-dvh sm:h-auto sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-xl box-border'
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className='flex items-center justify-between pb-4 border-b'>
                    <h2 className='font-bold text-lg'>Edit Product</h2>
                    <button type="button" onClick={close} className='hover:text-red-600 transition-colors p-1 cursor-pointer'>
                        <IoClose size={25} />
                    </button>
                </div>

                <form className='grid gap-4 py-4 w-full min-w-0' onSubmit={handleSubmit}>
                    {/* Images */}
                    <div className='grid gap-1 w-full min-w-0'>
                        <p className='font-medium'>Product Images</p>
                        <div className='flex flex-wrap gap-3'>
                            {productData.image.map((img, index) => (
                                <div key={img + index} className='relative w-20 h-20 bg-blue-50 border rounded p-1 group flex-shrink-0'>
                                    <img src={optimizeImage(img, 150)} alt={`product-${index}`} onError={handleImgError} className='w-full h-full object-scale-down'/>
                                    <button type="button" onClick={() => handleRemoveImage(index)} className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full cursor-pointer flex items-center justify-center p-0.5'>
                                        <IoClose size={14} />
                                    </button>
                                </div>
                            ))}
                            <label htmlFor='upload-image' className='w-20 h-20 bg-blue-50 border border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-blue-100 flex-shrink-0'>
                                {imageLoading ? <Loading /> : <p className='text-xs text-neutral-500'>Upload</p>}
                                <input type='file' id='upload-image' className='hidden' onChange={handleUploadImage}/>
                            </label>
                        </div>
                    </div>

                    {/* Name */}
                    <div className='grid gap-1 w-full min-w-0'>
                        <label htmlFor='name' className='font-medium'>Name</label>
                        <input id='name' name='name' value={productData.name} onChange={handleOnChange} className={fieldClass} required/>
                    </div>

                    {/* Category */}
                    <div className='grid gap-1 w-full min-w-0'>
                        <label className='font-medium'>Category</label>
                        <div className='flex flex-wrap gap-2 mb-1'>
                            {productData.category.map((c) => (
                                <div key={c._id} className='flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full'>
                                    <span>{c.name || c._id}</span>
                                    <button type="button" onClick={() => handleRemoveCategory(c._id)} className='hover:text-red-600'>
                                        <IoClose size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <select value={selectCategory} onChange={handleAddCategory} className={fieldClass}>
                            <option value=''>-- Select Category --</option>
                            {allCategory.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* SubCategory */}
                    <div className='grid gap-1 w-full min-w-0'>
                        <label className='font-medium'>Sub Category</label>
                        <div className='flex flex-wrap gap-2 mb-1'>
                            {productData.subCategory.map((s) => (
                                <div key={s._id} className='flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full'>
                                    <span>{s.name || s._id}</span>
                                    <button type="button" onClick={() => handleRemoveSubCategory(s._id)} className='hover:text-red-600'>
                                        <IoClose size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <select value={selectSubCategory} onChange={handleAddSubCategory} className={fieldClass}>
                            <option value=''>-- Select Sub Category --</option>
                            {allSubCategory.map(sub => (
                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Unit & Stock */}
                    <div className='grid grid-cols-2 gap-4 w-full min-w-0'>
                        <div className='grid gap-1 w-full min-w-0'>
                            <label htmlFor='unit' className='font-medium'>Unit</label>
                            <input id='unit' name='unit' value={productData.unit} onChange={handleOnChange} className={fieldClass}/>
                        </div>
                        <div className='grid gap-1 w-full min-w-0'>
                            <label htmlFor='stock' className='font-medium'>Stock</label>
                            <input id='stock' name='stock' type='number' value={productData.stock} onChange={handleOnChange} className={fieldClass}/>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className='bg-green-50 border border-green-200 rounded-xl p-4 grid gap-3 w-full min-w-0'>
                        <p className='font-bold text-green-800 text-sm uppercase tracking-wider'>💰 Pricing</p>
                        <div className='grid gap-1 w-full min-w-0'>
                            <label htmlFor='sellerPrice' className='font-medium text-sm'>Seller Price <span className='text-xs text-slate-400 font-normal'>(what seller earns)</span></label>
                            <div className='relative w-full min-w-0'>
                                <span className='absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500'>₹</span>
                                <input id='sellerPrice' name='sellerPrice' type='number' placeholder='e.g. 200' value={productData.sellerPrice} onChange={handleOnChange} className='bg-white pl-7 p-2 w-full min-w-0 box-border outline-none border focus-within:border-green-400 rounded'/>
                            </div>
                        </div>
                        <div className='grid gap-1 w-full min-w-0'>
                            <label htmlFor='snapitMargin' className='font-medium text-sm'>Snapit Margin <span className='text-xs text-slate-400 font-normal'>(your profit added on top)</span></label>
                            <div className='relative w-full min-w-0'>
                                <span className='absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500'>₹</span>
                                <input id='snapitMargin' name='snapitMargin' type='number' placeholder='e.g. 10' value={productData.snapitMargin} onChange={handleOnChange} className='bg-white pl-7 p-2 w-full min-w-0 box-border outline-none border focus-within:border-green-400 rounded'/>
                            </div>
                        </div>
                        <div className='grid gap-1 w-full min-w-0'>
                            <label className='font-medium text-sm'>Customer Pays (MRP) <span className='text-xs text-slate-400 font-normal'>(auto-calculated)</span></label>
                            <div className='bg-white border-2 border-green-400 rounded p-2 flex flex-wrap items-center justify-between gap-1 w-full min-w-0'>
                                <span className='text-2xl font-black text-green-700'>₹{sellingPrice.toFixed(2)}</span>
                                <div className='text-right text-xs text-slate-500'>
                                    <p>₹{productData.sellerPrice || 0} seller + ₹{productData.snapitMargin || 0} margin</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Discount */}
                    <div className='grid gap-1 w-full min-w-0'>
                        <label htmlFor='discount' className='font-medium'>Discount %</label>
                        <input id='discount' name='discount' type='number' placeholder='Enter discount %' value={productData.discount} onChange={handleOnChange} className={fieldClass}/>
                    </div>

                    {/* Description */}
                    <div className='grid gap-1 w-full min-w-0'>
                        <label htmlFor='description' className='font-medium'>Description</label>
                        <textarea id='description' name='description' rows={3} value={productData.description} onChange={handleOnChange} className={fieldClass + ' resize-none'}/>
                    </div>

                    {/* Variant Group */}
                    <div className='grid gap-1 w-full min-w-0'>
                        <label htmlFor='variantGroup' className='font-medium'>Variant Group <span className='text-gray-400 font-normal text-xs'>(optional)</span></label>
                        <input id='variantGroup' name='variantGroup' value={productData.variantGroup} onChange={handleOnChange} placeholder='e.g. lays-classic or amul-butter' className={fieldClass}/>
                        <p className='text-[11px] text-gray-400'>Give the same group name to all size variants of this product so they appear as size pills on the product page.</p>
                    </div>
                    
                    <button type="submit" disabled={imageLoading} className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded mt-2 transition-all active:scale-95 w-full ${imageLoading ? "opacity-50 cursor-not-allowed" : ""}`}>
                        {imageLoading ? "Uploading..." : "Update Product"}
                    </button>
                </form>
            </div>
        </section>
    )
}

export default EditProductAdmin