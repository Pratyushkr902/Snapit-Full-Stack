import React, { useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'

const StartFlashSale = ({ productId, productName }) => {
    const [discount,  setDiscount]  = useState('')
    const [duration,  setDuration]  = useState('')
    const [loading,   setLoading]   = useState(false)
    const [showForm,  setShowForm]  = useState(false)

    const handleStart = async () => {
        if (!discount || !duration) {
            toast.error('Fill all fields')
            return
        }
        setLoading(true)
        try {
            const res = await Axios({
                ...SummaryApi.startFlashSale,
                data: {
                    productId,
                    discountPercent: Number(discount),
                    durationMinutes: Number(duration)
                }
            })
            if (res.data.success) {
                toast.success(res.data.message)
                setShowForm(false)
            }
        } catch (err) {
            toast.error('Failed to start flash sale')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <button
                onClick={() => setShowForm(!showForm)}
                className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm"
            >
                ⚡ Flash Sale
            </button>

            {showForm && (
                <div className="mt-2 border rounded-xl p-3 bg-red-50">
                    <p className="text-sm font-medium mb-2">
                        {productName}
                    </p>
                    <input
                        type="number"
                        placeholder="Discount % (e.g. 20)"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                    />
                    <input
                        type="number"
                        placeholder="Duration in minutes (e.g. 30)"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                    />
                    <button
                        onClick={handleStart}
                        disabled={loading}
                        className="w-full bg-red-500 text-white py-2 rounded-lg text-sm font-medium"
                    >
                        {loading ? 'Starting...' : 'Start Flash Sale'}
                    </button>
                </div>
            )}
        </div>
    )
}

export default StartFlashSale