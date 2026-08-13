import React, { useState } from 'react'
import { FaCloudUploadAlt } from "react-icons/fa";
import uploadImage from '../utils/UploadImage';
import Loading from '../components/Loading';
import ViewImage from '../components/ViewImage';
import { MdDelete } from "react-icons/md";
import { useSelector } from 'react-redux'
import { IoClose } from "react-icons/io5";
import AddFieldComponent from '../components/AddFieldComponent';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import successAlert from '../utils/SuccessAlert';

const UploadProduct = () => {
  const [data, setData] = useState({
      name         : "",
      image        : [],
      imageThumbnail : [],
      category     : [],
      subCategory  : [],
      unit         : "",
      stock        : "",
      sellerPrice  : "",   // what seller earns
      snapitMargin : "",   // Snapit's profit on top
      discount     : "",
      description  : "",
      more_details : {},
  })
  const [imageLoading, setImageLoading]   = useState(false)
  const [ViewImageURL, setViewImageURL]   = useState("")
  const allCategory                       = useSelector(state => state.product.allCategory)
  const [selectCategory, setSelectCategory]       = useState("")
  const [selectSubCategory, setSelectSubCategory] = useState("")
  const allSubCategory = useSelector(state => state.product.allSubCategory)
  const [openAddField, setOpenAddField]   = useState(false)
  const [fieldName, setFieldName]         = useState("")

  // Auto-calculated selling price shown live
  const sellingPrice = Number(data.sellerPrice || 0) + Number(data.snapitMargin || 0)

  const handleChange = (e) => {
    const { name, value } = e.target
    setData(prev => ({ ...prev, [name]: value }))
  }

  const handleUploadImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageLoading(true)
    try {
        const response = await uploadImage(file)
        const { data: ImageResponse } = response
        const imageUrl = ImageResponse.data.url
        // thumbnail_url may be null if generation failed on the backend —
        // in that case we just push the full image so nothing breaks;
        // the frontend falls back to `image` wherever `imageThumbnail` is empty.
        const thumbnailUrl = ImageResponse.data.thumbnail_url || imageUrl
        setData(prev => ({
            ...prev,
            image: [...prev.image, imageUrl],
            imageThumbnail: [...(prev.imageThumbnail || []), thumbnailUrl]
        }))
    } catch (error) {
        AxiosToastError(error)
    } finally {
        setImageLoading(false)
    }
  }

  const handleDeleteImage = (index) => {
    setData(prev => {
      const newList = [...prev.image]
      newList.splice(index, 1)
      // Keep imageThumbnail in sync so indexes don't drift out of
      // alignment with `image` after a delete.
      const newThumbList = [...(prev.imageThumbnail || [])]
      newThumbList.splice(index, 1)
      return { ...prev, image: newList, imageThumbnail: newThumbList }
    })
  }

  const handleRemoveCategory = (index) => {
    setData(prev => {
      const newList = [...prev.category]
      newList.splice(index, 1)
      return { ...prev, category: newList }
    })
  }

  const handleRemoveSubCategory = (index) => {
    setData(prev => {
      const newList = [...prev.subCategory]
      newList.splice(index, 1)
      return { ...prev, subCategory: newList }
    })
  }

  const handleAddField = () => {
    setData(prev => ({
      ...prev,
      more_details: { ...prev.more_details, [fieldName]: "" }
    }))
    setFieldName("")
    setOpenAddField(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const resolvedSellerPrice  = Number(data.sellerPrice)  || 0
    const resolvedMargin       = Number(data.snapitMargin) || 0
    const resolvedSellingPrice = resolvedSellerPrice + resolvedMargin

    const payload = {
        ...data,
        category     : data.category.map(c => c._id),
        subCategory  : data.subCategory.map(s => s._id),
        sellerPrice  : resolvedSellerPrice,
        snapitMargin : resolvedMargin,
        sellingPrice : resolvedSellingPrice,
        price        : resolvedSellingPrice,   // customer pays this
    }

    try {
      const response = await Axios({ ...SummaryApi.createProduct, data: payload })
      const { data: responseData } = response
      if (responseData.success) {
          successAlert(responseData.message)
          setData({
            name: "", image: [], category: [], subCategory: [],
            unit: "", stock: "", sellerPrice: "", snapitMargin: "",
            discount: "", description: "", more_details: {},
          })
      }
    } catch (error) {
        AxiosToastError(error)
    }
  }

  return (
    <section className=''>
        <div className='p-2 bg-white shadow-md flex items-center justify-between'>
            <h2 className='font-semibold'>Upload Product</h2>
        </div>
        <div className='grid p-3'>
            <form className='grid gap-4' onSubmit={handleSubmit}>

                {/* Name */}
                <div className='grid gap-1'>
                  <label htmlFor='name' className='font-medium'>Name</label>
                  <input
                    id='name' type='text' placeholder='Enter product name'
                    name='name' value={data.name} onChange={handleChange} required
                    className='bg-blue-50 p-2 outline-none border focus-within:border-primary-200 rounded'
                  />
                </div>

                {/* Description */}
                <div className='grid gap-1'>
                  <label htmlFor='description' className='font-medium'>Description</label>
                  <textarea
                    id='description' placeholder='Enter product description'
                    name='description' value={data.description} onChange={handleChange} required rows={3}
                    className='bg-blue-50 p-2 outline-none border focus-within:border-primary-200 rounded resize-none'
                  />
                </div>

                {/* Image Upload */}
                <div>
                    <p className='font-medium'>Image</p>
                    <div>
                      <label htmlFor='productImage' className='bg-blue-50 h-24 border rounded flex justify-center items-center cursor-pointer'>
                          <div className='text-center flex justify-center items-center flex-col'>
                            {imageLoading ? <Loading/> : (
                              <><FaCloudUploadAlt size={35}/><p>Upload Image</p></>
                            )}
                          </div>
                          <input type='file' id='productImage' className='hidden' accept='image/*' onChange={handleUploadImage}/>
                      </label>
                      <div className='flex flex-wrap gap-4'>
                        {data.image.map((img, index) => (
                          <div key={img+index} className='h-20 mt-1 w-20 min-w-20 bg-blue-50 border relative group'>
                            <img src={img} alt={img} className='w-full h-full object-scale-down cursor-pointer' onClick={() => setViewImageURL(img)}/>
                            <div onClick={() => handleDeleteImage(index)} className='absolute bottom-0 right-0 p-1 bg-red-600 rounded text-white hidden group-hover:block cursor-pointer'>
                              <MdDelete/>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                </div>

                {/* Category */}
                <div className='grid gap-1'>
                  <label className='font-medium'>Category</label>
                  <div>
                    <select className='bg-blue-50 border w-full p-2 rounded' value={selectCategory}
                      onChange={(e) => {
                        const value = e.target.value
                        const category = allCategory.find(el => el._id === value)
                        if (category && !data.category.some(c => c._id === category._id)) {
                            setData(prev => ({ ...prev, category: [...prev.category, category] }))
                        }
                        setSelectCategory("")
                      }}>
                      <option value={""}>Select Category</option>
                      {allCategory.map((c) => <option key={c?._id} value={c?._id}>{c.name}</option>)}
                    </select>
                    <div className='flex flex-wrap gap-3'>
                      {data.category.map((c, index) => (
                        <div key={c._id+index} className='text-sm flex items-center gap-1 bg-blue-50 mt-2 px-2 py-1 rounded'>
                          <p>{c.name}</p>
                          <div className='hover:text-red-500 cursor-pointer' onClick={() => handleRemoveCategory(index)}><IoClose size={20}/></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sub Category */}
                <div className='grid gap-1'>
                  <label className='font-medium'>Sub Category</label>
                  <div>
                    <select className='bg-blue-50 border w-full p-2 rounded' value={selectSubCategory}
                      onChange={(e) => {
                        const value = e.target.value
                        const subCategory = allSubCategory.find(el => el._id === value)
                        if (subCategory && !data.subCategory.some(s => s._id === subCategory._id)) {
                            setData(prev => ({ ...prev, subCategory: [...prev.subCategory, subCategory] }))
                        }
                        setSelectSubCategory("")
                      }}>
                      <option value={""}>Select Sub Category</option>
                      {allSubCategory.map((c) => <option key={c?._id} value={c?._id}>{c.name}</option>)}
                    </select>
                    <div className='flex flex-wrap gap-3'>
                      {data.subCategory.map((c, index) => (
                        <div key={c._id+index} className='text-sm flex items-center gap-1 bg-blue-50 mt-2 px-2 py-1 rounded'>
                          <p>{c.name}</p>
                          <div className='hover:text-red-500 cursor-pointer' onClick={() => handleRemoveSubCategory(index)}><IoClose size={20}/></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Unit */}
                <div className='grid gap-1'>
                  <label htmlFor='unit' className='font-medium'>Unit</label>
                  <input id='unit' type='text' placeholder='Enter product unit' name='unit'
                    value={data.unit} onChange={handleChange} required
                    className='bg-blue-50 p-2 outline-none border focus-within:border-primary-200 rounded'/>
                </div>

                {/* Stock */}
                <div className='grid gap-1'>
                  <label htmlFor='stock' className='font-medium'>Number of Stock</label>
                  <input id='stock' type='number' placeholder='Enter product stock' name='stock'
                    value={data.stock} onChange={handleChange} required
                    className='bg-blue-50 p-2 outline-none border focus-within:border-primary-200 rounded'/>
                </div>

                {/* ── PRICING SECTION ─────────────────────────── */}
                <div className='bg-green-50 border border-green-200 rounded-xl p-4 grid gap-3'>
                    <p className='font-bold text-green-800 text-sm uppercase tracking-wider'>💰 Pricing</p>

                    {/* Seller Price */}
                    <div className='grid gap-1'>
                      <label htmlFor='sellerPrice' className='font-medium text-sm'>
                        Seller Price <span className='text-xs text-slate-400 font-normal'>(what seller earns)</span>
                      </label>
                      <div className='relative'>
                        <span className='absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500'>₹</span>
                        <input id='sellerPrice' type='number' placeholder='e.g. 200' name='sellerPrice'
                          value={data.sellerPrice} onChange={handleChange} required
                          className='bg-white pl-7 p-2 w-full outline-none border focus-within:border-green-400 rounded'/>
                      </div>
                    </div>

                    {/* Snapit Margin */}
                    <div className='grid gap-1'>
                      <label htmlFor='snapitMargin' className='font-medium text-sm'>
                        Snapit Margin <span className='text-xs text-slate-400 font-normal'>(your profit added on top)</span>
                      </label>
                      <div className='relative'>
                        <span className='absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500'>₹</span>
                        <input id='snapitMargin' type='number' placeholder='e.g. 10' name='snapitMargin'
                          value={data.snapitMargin} onChange={handleChange}
                          className='bg-white pl-7 p-2 w-full outline-none border focus-within:border-green-400 rounded'/>
                      </div>
                    </div>

                    {/* Auto-calculated MRP */}
                    <div className='grid gap-1'>
                      <label className='font-medium text-sm'>
                        Customer Pays (MRP) <span className='text-xs text-slate-400 font-normal'>(auto-calculated)</span>
                      </label>
                      <div className='bg-white border-2 border-green-400 rounded p-2 flex items-center justify-between'>
                        <span className='text-2xl font-black text-green-700'>₹{sellingPrice.toFixed(2)}</span>
                        <div className='text-right text-xs text-slate-500'>
                          <p>₹{data.sellerPrice || 0} seller + ₹{data.snapitMargin || 0} margin</p>
                        </div>
                      </div>
                    </div>
                </div>
                {/* ─────────────────────────────────────────────── */}

                {/* Discount */}
                <div className='grid gap-1'>
                  <label htmlFor='discount' className='font-medium'>Discount %</label>
                  <input id='discount' type='number' placeholder='Enter product discount %' name='discount'
                    value={data.discount} onChange={handleChange} required
                    className='bg-blue-50 p-2 outline-none border focus-within:border-primary-200 rounded'/>
                </div>

                {/* Dynamic extra fields */}
                {Object?.keys(data?.more_details)?.map((k, index) => (
                  <div key={k+index} className='grid gap-1'>
                    <label htmlFor={k} className='font-medium'>{k}</label>
                    <input id={k} type='text' value={data?.more_details[k]}
                      onChange={(e) => {
                        const value = e.target.value
                        setData(prev => ({ ...prev, more_details: { ...prev.more_details, [k]: value } }))
                      }}
                      required
                      className='bg-blue-50 p-2 outline-none border focus-within:border-primary-200 rounded'/>
                  </div>
                ))}

                <div onClick={() => setOpenAddField(true)}
                  className='hover:bg-primary-200 bg-white py-1 px-3 w-32 text-center font-semibold border border-primary-200 hover:text-neutral-900 cursor-pointer rounded'>
                  Add Fields
                </div>

                <button type="submit" className='bg-primary-100 hover:bg-primary-200 py-2 rounded font-semibold'>
                  Submit
                </button>
            </form>
        </div>

        {ViewImageURL && <ViewImage url={ViewImageURL} close={() => setViewImageURL("")}/>}
        {openAddField && (
          <AddFieldComponent
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            submit={handleAddField}
            close={() => setOpenAddField(false)}
          />
        )}
    </section>
  )
}

export default UploadProduct