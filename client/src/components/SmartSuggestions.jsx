import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'

const SmartSuggestions = ({ productId }) => {
    const [suggestions, setSuggestions] = useState([])

    useEffect(() => {
        if (!productId) return
        const fetchSuggestions = async () => {
            try {
                const res = await Axios({
                    ...SummaryApi.getFrequentlyBought,
                    params: { productId }
                })
                if (res.data.success) {
                    setSuggestions(res.data.data)
                }
            } catch (err) {
                console.log(err)
            }
        }
        fetchSuggestions()
    }, [productId])

    if (suggestions.length === 0) return null

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">
                You might also like
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
                {suggestions.map((item) => (
                    <div
                        key={item._id}
                        className="min-w-[140px] border rounded-xl p-3 bg-white shadow-sm"
                    >
                        <img
                            src={item.image[0]}
                            alt={item.name}
                            className="w-full h-20 object-contain mb-2"
                        />
                        <p className="text-sm font-medium line-clamp-2">
                            {item.name}
                        </p>
                        <p className="text-green-600 font-bold text-sm mt-1">
                            ₹{item.price}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default SmartSuggestions