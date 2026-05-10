import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FaStar } from 'react-icons/fa'

const StarRating = ({ value, onChange, readonly = false }) => {
    const [hover, setHover] = useState(0)
    return (
        <div className='flex gap-1'>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type='button'
                    onClick={() => !readonly && onChange && onChange(star)}
                    onMouseEnter={() => !readonly && setHover(star)}
                    onMouseLeave={() => !readonly && setHover(0)}
                    className={`text-xl transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                >
                    <FaStar className={`${(hover || value) >= star ? 'text-yellow-400' : 'text-slate-200'} transition-colors`} />
                </button>
            ))}
        </div>
    )
}

const ProductReviews = ({ productId }) => {
    const user = useSelector(state => state.user)
    const [reviews, setReviews] = useState([])
    const [avgRating, setAvgRating] = useState(0)
    const [totalReviews, setTotalReviews] = useState(0)
    const [loading, setLoading] = useState(true)
    const [myRating, setMyRating] = useState(0)
    const [myComment, setMyComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showForm, setShowForm] = useState(false)

    const fetchReviews = async () => {
        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.getReviews,
                data: { productId }
            })
            if (response.data.success) {
                setReviews(response.data.data)
                setAvgRating(response.data.avgRating)
                setTotalReviews(response.data.totalReviews)

                // Pre-fill if user already reviewed
                if (user?._id) {
                    const myReview = response.data.data.find(r => r.userId === user._id)
                    if (myReview) {
                        setMyRating(myReview.rating)
                        setMyComment(myReview.comment)
                    }
                }
            }
        } catch (error) {
            console.error('Reviews fetch error', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (productId) fetchReviews()
    }, [productId])

    const handleSubmit = async () => {
        if (!user?._id) {
            toast.error('Please login to submit a review')
            return
        }
        if (!myRating) {
            toast.error('Please select a star rating')
            return
        }
        try {
            setSubmitting(true)
            const response = await Axios({
                ...SummaryApi.addReview,
                data: { productId, rating: myRating, comment: myComment }
            })
            if (response.data.success) {
                toast.success('Review submitted!')
                setShowForm(false)
                fetchReviews()
            }
        } catch (error) {
            toast.error('Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    const ratingBars = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
        pct: totalReviews ? Math.round((reviews.filter(r => r.rating === star).length / totalReviews) * 100) : 0
    }))

    return (
        <div className='mt-8'>
            <h3 className='font-black text-slate-800 text-xl mb-6 uppercase tracking-tight'>Ratings & Reviews</h3>

            {/* Summary */}
            <div className='flex gap-8 items-center bg-slate-50 rounded-2xl p-5 mb-6'>
                <div className='text-center'>
                    <p className='text-5xl font-black text-slate-900'>{avgRating || '—'}</p>
                    <StarRating value={Math.round(avgRating)} readonly />
                    <p className='text-xs text-slate-400 mt-1 font-medium'>{totalReviews} reviews</p>
                </div>
                <div className='flex-1 flex flex-col gap-1.5'>
                    {ratingBars.map(({ star, count, pct }) => (
                        <div key={star} className='flex items-center gap-2'>
                            <span className='text-xs font-bold text-slate-500 w-4'>{star}</span>
                            <FaStar className='text-yellow-400 text-xs' />
                            <div className='flex-1 h-2 bg-slate-200 rounded-full overflow-hidden'>
                                <div className='h-full bg-yellow-400 rounded-full transition-all duration-700' style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className='text-xs text-slate-400 w-6'>{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Write Review Button */}
            {user?._id && (
                <button
                    onClick={() => setShowForm(!showForm)}
                    className='mb-6 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95'
                >
                    {showForm ? 'Cancel' : '✍️ Write a Review'}
                </button>
            )}

            {/* Review Form */}
            {showForm && (
                <div className='bg-white border border-slate-100 rounded-2xl p-5 mb-6 shadow-sm'>
                    <p className='font-bold text-slate-800 mb-3'>Your Rating</p>
                    <StarRating value={myRating} onChange={setMyRating} />
                    <textarea
                        value={myComment}
                        onChange={e => setMyComment(e.target.value)}
                        placeholder='Share your experience with this product...'
                        rows={3}
                        className='w-full mt-4 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-green-400 resize-none'
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className='mt-3 bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60'
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            )}

            {/* Review List */}
            {loading ? (
                <div className='flex flex-col gap-3'>
                    {[1, 2, 3].map(i => (
                        <div key={i} className='bg-slate-100 animate-pulse h-20 rounded-xl'></div>
                    ))}
                </div>
            ) : reviews.length === 0 ? (
                <div className='text-center py-10'>
                    <p className='text-3xl mb-2'>⭐</p>
                    <p className='text-slate-400 font-medium'>No reviews yet. Be the first!</p>
                </div>
            ) : (
                <div className='flex flex-col gap-4'>
                    {reviews.map(review => (
                        <div key={review._id} className='bg-white border border-slate-100 rounded-2xl p-4 shadow-sm'>
                            <div className='flex items-center justify-between mb-2'>
                                <div className='flex items-center gap-2'>
                                    <div className='w-8 h-8 bg-green-100 rounded-full flex items-center justify-center font-black text-green-700 text-sm'>
                                        {review.userName?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className='font-bold text-slate-800 text-sm'>{review.userName}</p>
                                        <p className='text-[10px] text-slate-400'>{new Date(review.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <StarRating value={review.rating} readonly />
                            </div>
                            {review.comment && (
                                <p className='text-slate-600 text-sm leading-relaxed mt-1'>{review.comment}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ProductReviews