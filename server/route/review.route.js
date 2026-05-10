import { Router } from 'express'
import { addReview, getProductReviews, deleteReview } from '../controllers/review.controller.js'
import { toggleWishlist, getWishlist } from '../controllers/wishlist.controller.js'
import auth from '../middleware/auth.js'

const reviewRouter = Router()

// Reviews
reviewRouter.post('/add', auth, addReview)
reviewRouter.post('/get', getProductReviews)
reviewRouter.delete('/delete', auth, deleteReview)

// Wishlist
reviewRouter.post('/wishlist/toggle', auth, toggleWishlist)
reviewRouter.get('/wishlist/get', auth, getWishlist)

export default reviewRouter