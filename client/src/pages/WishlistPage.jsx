import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import CardProduct from '../components/CardProduct'
import { Link } from 'react-router-dom'
import { FaHeart } from 'react-icons/fa'

const WishlistPage = () => {
    const [wishlist, setWishlist] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchWishlist = async () => {
        try {
            setLoading(true)
            const response = await Axios({ ...SummaryApi.getWishlist })
            if (response.data.success) {
                setWishlist(response.data.data || [])
            }
        } catch (error) {
            console.error('Wishlist fetch error', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchWishlist()
    }, [])

    return (
        <div className='min-h-screen bg-slate-50'>
            <div className='bg-white sticky top-0 z-10 shadow-sm px-4 py-4 flex items-center gap-3'>
                <FaHeart className='text-red-500' size={20} />
                <h1 className='font-black text-slate-900 text-lg'>My Wishlist</h1>
                <span className='ml-auto text-sm text-slate-400 font-medium'>{wishlist.length} items</span>
            </div>

            <div className='container mx-auto px-4 py-6'>
                {loading ? (
                    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                        {new Array(6).fill(null).map((_, i) => (
                            <div key={i} className='bg-slate-200 animate-pulse rounded-2xl h-64'></div>
                        ))}
                    </div>
                ) : wishlist.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-24 gap-4'>
                        <p className='text-6xl'>💔</p>
                        <p className='font-black text-slate-700 text-xl'>Your wishlist is empty</p>
                        <p className='text-slate-400 text-sm text-center'>Save products you love and find them here anytime</p>
                        <Link
                            to='/'
                            className='bg-green-600 text-white font-bold px-8 py-3 rounded-2xl hover:bg-green-700 transition-all active:scale-95'
                        >
                            Start Shopping
                        </Link>
                    </div>
                ) : (
                    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                        {wishlist.map(product => (
                            <CardProduct key={product._id} data={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default WishlistPage