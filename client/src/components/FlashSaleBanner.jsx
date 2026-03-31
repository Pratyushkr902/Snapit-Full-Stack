import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { Link } from 'react-router-dom'

const FlashSaleBanner = () => {
    const [sales, setSales]     = useState([])
    const [timers, setTimers]   = useState({})

    useEffect(() => {
        fetchFlashSales()
    }, [])

    const fetchFlashSales = async () => {
        try {
            const res = await Axios({ ...SummaryApi.getActiveFlashSales })
            if (res.data.success) {
                setSales(res.data.data)
            }
        } catch (err) {
            console.log(err)
        }
    }

    // Countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            const updated = {}
            sales.forEach((sale) => {
                const end       = new Date(sale.flashSale.endTime)
                const now       = new Date()
                const diff      = end - now
                if (diff <= 0) {
                    updated[sale._id] = 'Ended'
                } else {
                    const mins = Math.floor(diff / 60000)
                    const secs = Math.floor((diff % 60000) / 1000)
                    updated[sale._id] = `${mins}m ${secs}s`
                }
            })
            setTimers(updated)
        }, 1000)

        return () => clearInterval(interval)
    }, [sales])

    if (sales.length === 0) return null

    return (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-red-500 text-lg">⚡</span>
                <h2 className="font-bold text-red-600 text-lg">
                    Flash Sales — Limited Time!
                </h2>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
                {sales.map((product) => (
                    <div
                        key={product._id}
                        className="min-w-[160px] bg-white border border-red-200 rounded-xl p-3 flex-shrink-0"
                    >
                        <img
                            src={product.image?.[0]}
                            alt={product.name}
                            className="w-full h-20 object-contain mb-2"
                        />
                        <p className="text-sm font-semibold line-clamp-1">
                            {product.name}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-green-600 font-bold">
                                ₹{product.price}
                            </span>
                            <span className="text-gray-400 line-through text-xs">
                                ₹{product.flashSale.originalPrice}
                            </span>
                        </div>

                        <div className="bg-red-500 text-white text-xs text-center rounded-lg py-1 mt-2">
                            {product.flashSale.discountPercent}% OFF
                        </div>

                        <div className="text-center text-xs text-red-500 font-medium mt-1">
                            ⏱ {timers[product._id] || 'Loading...'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default FlashSaleBanner