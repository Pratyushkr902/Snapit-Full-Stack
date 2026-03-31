import React, { useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'

const ReorderButton = ({ orderId }) => {
    const [loading, setLoading] = useState(false)

    const handleReorder = async () => {
        setLoading(true)
        try {
            const response = await Axios({
                ...SummaryApi.getLastOrder
            })
            if (response.data.success) {
                toast.success('Items added to cart!')
            }
        } catch (err) {
            toast.error('Could not reorder. Try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleReorder}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
        >
            {loading ? 'Adding...' : '🔁 Reorder'}
        </button>
    )
}

export default ReorderButton