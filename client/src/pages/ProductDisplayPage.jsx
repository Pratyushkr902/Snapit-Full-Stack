import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import { FaAngleRight,FaAngleLeft } from "react-icons/fa6";
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import Divider from '../components/Divider'
import image1 from '../assets/minute_delivery.png'
import image2 from '../assets/Best_Prices_Offers.png'
import image3 from '../assets/Wide_Assortment.png'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import AddToCartButton from '../components/AddToCartButton'
import SmartSuggestions from '../components/SmartSuggestions'

const ProductDisplayPage = () => {
  const params = useParams()
  let productId = params?.product?.split("-")?.slice(-1)[0]
  
  const [data,setData] = useState({
    name : "",
    image : [],
    stock: 0,
    description: "",
    unit: "",
    more_details: {}
  })
  const [image,setImage] = useState(0)
  const [loading,setLoading] = useState(false)
  const imageContainer = useRef()
  const [isOpen, setIsOpen] = useState(true)

  const checkShopStatus = () => {
    const now = new Date()
    const hours = now.getHours()
    setIsOpen(hours >= 7 && hours < 21)
  }

  const fetchProductDetails = async()=>{
    try {
        setLoading(true) 
        const response = await Axios({
          ...SummaryApi.getProductDetails,
          data : { productId : productId }
        })
        if(response.data.success){
          setData(response.data.data)
        }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    fetchProductDetails()
    checkShopStatus()
  },[params])
  
  const handleScrollRight = () => { imageContainer.current.scrollLeft += 100 }
  const handleScrollLeft = () => { imageContainer.current.scrollLeft -= 100 }

  return (
    <section className='container mx-auto p-4'>
        <div className='grid lg:grid-cols-2 gap-8'>
            {/* Left Column: Media & Product Details */}
            <div>
                <div className='bg-white lg:min-h-[65vh] rounded-3xl flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden'>
                    {!loading && data?.image?.length > 0 ? (
                        <img 
                            src={data.image[image]?.replace("http://", "https://")} 
                            className='w-full h-full object-scale-down p-6' 
                            alt={data.name} 
                        /> 
                    ) : (
                        <div className='w-full h-full bg-slate-50 animate-pulse flex items-center justify-center'>
                           <p className='text-slate-400 font-bold'>Snapit</p>
                        </div>
                    )}
                </div>

                {/* Thumbnails */}
                <div className='flex items-center justify-center gap-3 my-4'>
                  {data.image.map((_, index)=>(
                    <div key={index} className={`w-2 h-2 rounded-full transition-all ${index === image ? "bg-green-600 w-4" : "bg-slate-200"}`}></div>
                  ))}
                </div>

                {/* DESCRIPTION AREA - Standard Case (Lower) */}
                <div className='my-10 space-y-6'>
                    <div>
                        <h3 className='text-xl font-black text-slate-800 mb-3'>Product Details</h3>
                        <p className='text-slate-600 leading-relaxed text-base lowercase first-letter:uppercase'>
                            {data.description || "Information currently being updated for this item."}
                        </p>
                    </div>
                    
                    <div className='grid gap-2'>
                        <p className='font-bold text-slate-700 text-sm uppercase tracking-wider'>Unit</p>
                        <p className='text-slate-500 text-base'>{data.unit}</p>
                    </div>

                    {data?.more_details && Object.entries(data.more_details).map(([key, value]) => (
                        <div key={key} className='border-t border-slate-50 pt-4'>
                            <p className='font-bold text-slate-700 text-sm mb-1 uppercase tracking-tight'>{key}</p>
                            <p className='text-slate-500 text-base lowercase first-letter:uppercase'>{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: Pricing & Purchase */}
            <div className='lg:pl-10'>
                <div className='flex items-center gap-2 mb-4'>
                    <span className='bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest'>⚡ 10 MINS</span>
                    {data.stock < 5 && data.stock > 0 && (
                        <span className='bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full uppercase'>Only {data.stock} Left</span>
                    )}
                </div>

                <h2 className='text-3xl lg:text-5xl font-black text-slate-900 mb-2 leading-tight'>{data.name}</h2>
                <p className='text-slate-400 font-bold uppercase text-xs tracking-widest mb-6'>{data.unit}</p>

                <Divider/>

                {/* PRICING AREA - Impactful Bold Upper Case */}
                <div className='bg-slate-50 p-6 rounded-3xl border border-slate-100 my-8 shadow-sm'>
                    <p className='text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3'>Price Details</p>
                    <div className='flex items-end gap-4'>
                        <span className='text-4xl lg:text-6xl font-black text-slate-900'>
                            {DisplayPriceInRupees(pricewithDiscount(Number(data.price || 0), Number(data.discount || 0)))}
                        </span>
                        {data.discount > 0 && (
                            <div className='flex flex-col mb-1'>
                                <span className='line-through text-slate-300 font-bold text-xl leading-none uppercase'>
                                    {DisplayPriceInRupees(Number(data.price || 0))}
                                </span>
                                <span className='text-green-600 font-black text-xl uppercase leading-none'>
                                    {data.discount}% OFF
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* STATUS & ACTIONS */}
                {!isOpen ? (
                    <div className='bg-slate-900 text-white p-6 rounded-3xl text-center uppercase tracking-widest font-black flex flex-col items-center'>
                        <span className='text-2xl mb-1'>🌙</span> Closed until 7 AM
                    </div>
                ) : data.stock <= 0 ? (
                    <div className='bg-rose-50 text-rose-600 p-6 rounded-3xl text-center uppercase tracking-widest font-black border-2 border-rose-100 shadow-sm'>
                        Out of Stock
                    </div>
                ) : (
                    <div className='my-8 h-16'>
                      <AddToCartButton data={data}/>
                    </div>
                  )
                }

                <div className='mt-12 space-y-8'>
                    <h4 className='font-black text-slate-800 text-sm uppercase tracking-widest border-b pb-2'>Why shop from Snapit?</h4>
                    <div className='flex items-center gap-5'>
                        <div className='w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center p-3'>
                            <img src={image1} alt='superfast' className='object-contain'/>
                        </div>
                        <div className='text-sm'>
                            <div className='font-bold text-slate-800 text-base'>Superfast Delivery</div>
                            <p className='text-slate-500'>Directly from our local dark stores.</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-5'>
                        <div className='w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center p-3'>
                            <img src={image2} alt='best prices' className='object-contain'/>
                        </div>
                        <div className='text-sm'>
                            <div className='font-bold text-slate-800 text-base'>Best Prices & Offers</div>
                            <p className='text-slate-500'>Unbeatable prices with student-focused discounts.</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-5'>
                        <div className='w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center p-3'>
                            <img src={image3} alt='assortment' className='object-contain'/>
                        </div>
                        <div className='text-sm'>
                            <div className='font-bold text-slate-800 text-base'>Wide Assortment</div>
                            <p className='text-slate-500'>Choose from thousands of campus essentials.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className='mt-20 border-t pt-10'>
            <SmartSuggestions productId={productId} />
        </div>
    </section>
  )
}

export default ProductDisplayPage