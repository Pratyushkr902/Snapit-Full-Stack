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
  // Extracts the MongoDB ID from the URL slug
  let productId = params?.product?.split("-")?.slice(-1)[0]
  
  const [data,setData] = useState({
    name : "",
    image : [],
    stock: 0
  })
  const [image,setImage] = useState(0)
  const [loading,setLoading] = useState(false)
  const imageContainer = useRef()

  // --- SHOP STATUS LOGIC (7 AM - 9 PM) ---
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
          data : {
            productId : productId 
          }
        })

        const { data : responseData } = response

        if(responseData.success){
          setData(responseData.data)
        }
    } catch (error) {
      AxiosToastError(error)
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{
    fetchProductDetails()
    checkShopStatus()
    
    const timer = setInterval(checkShopStatus, 60000)
    return () => clearInterval(timer)
  },[params])
  
  const handleScrollRight = ()=>{
    imageContainer.current.scrollLeft += 100
  }
  const handleScrollLeft = ()=>{
    imageContainer.current.scrollLeft -= 100
  }
  
  return (
    <section className='container mx-auto p-4'>
        <div className='grid lg:grid-cols-2'>
            {/* Left Column: Images and Mobile Details */}
            <div className=''>
                <div className='bg-white lg:min-h-[65vh] lg:max-h-[65vh] rounded min-h-56 max-h-56 h-full w-full flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm'>
                    {
                      !loading && data?.image?.length > 0 ? (
                        <img
                            src={data.image[image]?.replace("http://", "https://")}
                            className='w-full h-full object-scale-down p-4'
                            alt={data.name}
                        /> 
                      ) : (
                        <div className='w-full h-full bg-slate-50 animate-pulse flex items-center justify-center'>
                           <p className='text-slate-400'>Loading Product...</p>
                        </div>
                      )
                    }
                </div>
                <div className='flex items-center justify-center gap-3 my-4'>
                  {
                    data.image.map((img,index)=>{
                      return(
                        <div key={img+index+"point"} className={`w-2 h-2 rounded-full transition-all ${index === image ? "bg-green-600 w-4" : "bg-slate-200"}`}></div>
                      )
                    })
                  }
                </div>
                <div className='grid relative'>
                    <div ref={imageContainer} className='flex gap-4 z-10 relative w-full overflow-x-auto scrollbar-none snap-x px-2'>
                          {
                            data.image.map((img,index)=>{
                              return(
                                <div className={`w-20 h-20 min-w-20 rounded-lg border-2 transition-all overflow-hidden ${index === image ? 'border-green-500 shadow-md' : 'border-transparent opacity-70'}`} key={img+index}>
                                  <img
                                      src={img?.replace("http://", "https://")}
                                      alt='thumbnail'
                                      onClick={()=>setImage(index)}
                                      className='w-full h-full object-scale-down bg-white' 
                                  />
                                </div>
                              )
                            })
                          }
                    </div>
                    <div className='w-full -ml-3 h-full hidden lg:flex justify-between absolute items-center pointer-events-none'>
                        <button onClick={handleScrollLeft} className='pointer-events-auto z-10 bg-white p-2 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50'>
                            <FaAngleLeft/>
                        </button>
                        <button onClick={handleScrollRight} className='pointer-events-auto z-10 bg-white p-2 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50'>
                            <FaAngleRight/>
                        </button>
                    </div>
                </div>

                <div className='my-8 hidden lg:grid gap-4'>
                    <h3 className='font-bold text-xl text-slate-800 border-b pb-2'>Product Specifications</h3>
                    <div>
                        <p className='font-semibold text-slate-600'>Description</p>
                        <p className='text-base text-slate-500 leading-relaxed'>{data.description}</p>
                    </div>
                    <div>
                        <p className='font-semibold text-slate-600'>Unit</p>
                        <p className='text-base text-slate-500'>{data.unit}</p>
                    </div>
                    {
                      data?.more_details && Object.keys(data?.more_details).map((element,index)=>{
                        return(
                          <div key={element+index}>
                              <p className='font-semibold text-slate-600'>{element}</p>
                              <p className='text-base text-slate-500'>{data?.more_details[element]}</p>
                          </div>
                        )
                      })
                    }
                </div>
            </div>

            {/* Right Column: Pricing and Actions */}
            <div className='p-4 lg:pl-10 text-base lg:text-lg'>
                <div className='flex items-center gap-2 mb-2'>
                    <span className='bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1'>
                        ⚡ 10 MINS
                    </span>
                    {data.stock < 5 && data.stock > 0 && (
                        <span className='bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full'>
                            ONLY {data.stock} LEFT
                        </span>
                    )}
                </div>

                <h2 className='text-2xl font-black lg:text-4xl text-slate-900 mb-1'>{data.name}</h2>  
                <p className='text-slate-400 font-medium mb-4'>{data.unit}</p> 
                
                <Divider/>

                <div className='my-6'>
                  <p className='text-slate-500 text-sm font-bold uppercase tracking-wider mb-2'>Price Details</p> 
                  <div className='flex items-center gap-4'>
                    <div className='bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl shadow-slate-200'>
                        <p className='font-black text-2xl lg:text-3xl'>
                          {DisplayPriceInRupees(pricewithDiscount(Number(data.price || 0), Number(data.discount || 0)))}
                        </p>
                    </div>
                    {
                      data.discount > 0 && (
                        <div className='flex flex-col'>
                            <p className='line-through text-slate-400 font-bold'>
                                {DisplayPriceInRupees(Number(data.price || 0))}
                            </p>
                            <p className="font-black text-green-600 text-lg">
                                {data.discount}% OFF
                            </p>
                        </div>
                      )
                    }
                  </div>
                </div> 
                  
                {/* STATUS LOGIC */}
                {
                  !isOpen ? (
                      <div className='bg-slate-50 border-2 border-slate-200 p-6 rounded-3xl my-6 flex flex-col items-center gap-2'>
                          <span className='text-3xl'>🌙</span>
                          <p className='font-black text-slate-800 text-xl'>Snapit is Resting</p>
                          <p className='text-slate-500 font-medium'>Ordering resumes at 7:00 AM</p>
                      </div>
                  ) : data.stock === 0 ? (
                    <div className='bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl text-center my-6'>
                        <p className='text-rose-600 font-black text-xl italic'>Currently Out of Stock</p>
                    </div>
                  ) 
                  : (
                    <div className='my-8 h-14'>
                      <AddToCartButton data={data}/>
                    </div>
                  )
                }

                <div className='mt-10'>
                    <h2 className='font-black text-slate-800 text-lg uppercase tracking-tighter mb-4'>Why shop from Snapit?</h2>
                    <div className='space-y-6'>
                        <div className='flex items-center gap-5'>
                            <div className='w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center p-3'>
                                <img src={image1} alt='superfast' className='object-contain'/>
                            </div>
                            <div className='text-sm'>
                                <div className='font-bold text-slate-800 text-base'>Superfast Delivery</div>
                                <p className='text-slate-500'>Directly from our local dark stores .</p>
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
                                <p className='text-slate-500'>Everything from Maggi to gym supplements available.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- SMART RECOMMENDATIONS --- */}
        <div className='mt-12 border-t pt-10'>
            <SmartSuggestions productId={productId} />
        </div>
    </section>
  )
}

export default ProductDisplayPage