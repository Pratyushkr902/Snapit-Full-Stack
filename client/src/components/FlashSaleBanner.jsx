import React, { useEffect, useState, useCallback } from 'react' // Added useCallback
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { Link, useNavigate } from 'react-router-dom'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'

const FlashSaleBanner = () => {
    const [sales, setSales] = useState([])
    const [timers, setTimers] = useState({})
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    // --- FIXED: Optimized Timer Calculation ---
    const calculateTimers = useCallback(() => {
        const updated = {}
        sales.forEach((product) => {
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
                
                // Professional format: HH:MM:SS
                updated[product._id] = `${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s`
            }
        })
        setTimers(updated)
    }, [sales])

    const fetchFlashSales = async () => {
        try {
            setLoading(true)
            // Use the consistent key we added to SummaryApi
            const res = await Axios({ ...SummaryApi.getFlashSales }) 
            if (res.data.success) {
                setSales(res.data.data)
            }
        } catch (err) {
            console.error("Flash Sale Fetch Error:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFlashSales()
    }, [])

    // --- FIXED: Countdown timer logic ---
    useEffect(() => {
        if (sales.length === 0) return;

        // Run once immediately to avoid "Loading..." flash
        calculateTimers()

        const interval = setInterval(calculateTimers, 1000)
        return () => clearInterval(interval)
    }, [sales, calculateTimers])

    const handleProductClick = (product) => {
        navigate(`/product/${product._id}`)
    }

    // Hide entire component if no sales are active
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
                        <p className='text-[10px] text-red-400 font-bold uppercase'>IIT Roorkee Student Deals</p>
                    </div>
                </div>
                <Link to="/all-flash-sales" className='text-xs font-bold text-red-600 hover:underline'>View All</Link>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {loading ? (
                    new Array(4).fill(null).map((_, i) => (
                        <div key={i + "skeleton"} className="min-w-[180px] bg-white rounded-2xl p-4 animate-pulse border border-red-100">
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
                            <div className='absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl z-10'>
                                {product.flashSale?.discountPercent}% OFF
                            </div>

                            <div className='flex justify-center items-center h-28 mb-3 group-hover:scale-105 transition-transform'>
                                <img
                                    src={product.image?.[0]}
                                    alt={product.name}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => { e.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1773599668/Aashirvaad_Superior_MP_Whole_Wheat_Atta_z8tqsf.jpg" }}
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

                            {/* TIMER UI */}
                            <div className="flex items-center justify-center gap-1.5 bg-red-50 text-red-600 text-[11px] font-black rounded-lg py-1.5 border border-red-100">
                                <span>⏱</span>
                                <span className="tabular-nums">
                                    {timers[product._id] || 'Syncing...'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default FlashSaleBanner;