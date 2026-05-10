import React, { useEffect, useState } from 'react'
import { FaHeart, FaRegHeart } from 'react-icons/fa'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const WishlistButton = ({ productId }) => {
    const user = useSelector(state => state.user)
    const navigate = useNavigate()
    const [wishlisted, setWishlisted] = useState(false)
    const [loading, setLoading] = useState(false)

    // Check if already wishlisted on mount
    useEffect(() => {
        const checkWishlist = async () => {
            if (!user?._id) return
            try {
                const response = await Axios({ ...SummaryApi.getWishlist })
                if (response.data.success) {
                    const isIn = response.data.data.some(p => p._id === productId)
                    setWishlisted(isIn)
                }
            } catch (error) {
                console.error('Wishlist check error', error)
            }
        }
        checkWishlist()
    }, [productId, user?._id])

    const handleToggle = async (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (!user?._id) {
            toast.error('Please login to save items')
            navigate('/login')
            return
        }

        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.toggleWishlist,
                data: { productId }
            })
            if (response.data.success) {
                setWishlisted(response.data.wishlisted)
                toast.success(response.data.wishlisted ? '❤️ Added to wishlist' : 'Removed from wishlist')
            }
        } catch (error) {
            toast.error('Failed to update wishlist')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 ${
                wishlisted
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-400'
            }`}
            title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
            {wishlisted ? <FaHeart className='text-red-500' /> : <FaRegHeart />}
            <span>{wishlisted ? 'Wishlisted' : 'Wishlist'}</span>
        </button>
    )
}

export default WishlistButton