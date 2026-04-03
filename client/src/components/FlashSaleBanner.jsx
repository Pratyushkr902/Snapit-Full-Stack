import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { Link, useNavigate } from 'react-router-dom'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'

const FlashSaleBanner = () => {
    const [sales, setSales] = useState([])
    const [timers, setTimers] = useState({})
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchFlashSales()
    }, [])

    const fetchFlashSales = async () => {
        try {
            setLoading(true)
            const res = await Axios({ ...SummaryApi.getFlashSales }) // Fixed: Ensure this matches your SummaryApi key
            if (res.data.success) {
                setSales(res.data.data)
            }
        } catch (err) {
            console.error("Flash Sale Fetch Error:", err)
        } finally {
            setLoading(false)
        }
    }

    // Countdown timer logic
    useEffect(() => {
        if (sales.length === 0) return;

        const interval = setInterval(() => {
            const updated = {}
            sales.forEach((product) => {
                // Ensure we are accessing the nested flashSale object correctly
                const endTime = product.flashSale?.endTime;
                if (!endTime) return;

                const end = new Date(endTime).getTime()
                const now = new Date().getTime()
                const diff = end - now

                if (diff <= 0) {
                    updated[product._id] = 'Ended'
                } else {
                    const hours = Math.floor(diff / (1000 * 60 * 60))
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    const secs = Math.floor((diff % (1000 * 60)) / 1000)
                    
                    // Format: 00h 00m 00s
                    updated[product._id] = `${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s`
                }
            })
            setTimers(updated)
        }, 1000)

        return () => clearInterval(interval)
    }, [sales])

    // Handle Redirect to Product Details
    const handleProductClick = (product) => {
        navigate(`/product/${product._id}`)
    }

    if (!loading && sales.length === 0) return null

    return (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl animate-bounce">⚡</span>
                    <div>
                        <h2 className="font-black text-red-600 text-xl uppercase tracking-tighter">
                            Flash Sales
                        </h2>
                        <p className='text-[10px] text-red-400 font-bold uppercase'>Limited Stock Only</p>
                    </div>
                </div>
                <Link to="/all-flash-sales" className='text-xs font-bold text-red-600 hover:underline'>View All</Link>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {loading ? (
                    // Skeleton Loader for Demo
                    new Array(4).fill(null).map((_, i) => (
                        <div key={i} className="min-w-[180px] bg-white rounded-2xl p-4 animate-pulse border border-red-100">
                            <div className="w-full h-24 bg-slate-100 rounded-xl mb-3"></div>
                            <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                        </div>
                    ))
                ) : (
                    sales.map((product) => (
                        <div
                            key={product._id}
                            onClick={() => handleProductClick(product)}
                            className="min-w-[180px] bg-white border border-red-100 rounded-2xl p-4 flex-shrink-0 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                        >
                            {/* Discount Tag */}
                            <div className='absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl'>
                                {product.flashSale?.discountPercent}% OFF
                            </div>

                            <div className='flex justify-center items-center h-28 mb-3 group-hover:scale-105 transition-transform'>
                                <img
                                    src={product.image?.[0]}
                                    alt={product.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>

                            <p className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">
                                {product.name}
                            </p>

                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-green-700 font-black text-base">
                                    {DisplayPriceInRupees(product.price)}
                                </span>
                                <span className="text-slate-400 line-through text-[11px] font-medium">
                                    {DisplayPriceInRupees(product.flashSale?.originalPrice)}
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-1.5 bg-red-50 text-red-600 text-[11px] font-black rounded-lg py-1.5 border border-red-100">
                                <span>⏱</span>
                                <span className="tabular-nums">
                                    {timers[product._id] || 'Loading...'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default FlashSaleBanner