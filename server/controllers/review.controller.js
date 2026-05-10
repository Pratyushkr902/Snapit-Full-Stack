import ReviewModel from '../models/review.model.js'
import UserModel from '../models/user.model.js'

// Add or update a review
export async function addReview(request, response) {
    try {
        const userId = request.userId
        const { productId, rating, comment } = request.body

        if (!productId || !rating) {
            return response.status(400).json({
                message: "productId and rating are required",
                error: true,
                success: false
            })
        }

        const user = await UserModel.findById(userId).select('name')

        // Upsert: update if exists, create if not
        const review = await ReviewModel.findOneAndUpdate(
            { productId, userId },
            {
                productId,
                userId,
                userName: user.name,
                rating,
                comment: comment || ""
            },
            { upsert: true, new: true }
        )

        return response.json({
            message: "Review submitted successfully",
            error: false,
            success: true,
            data: review
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Get all reviews for a product
export async function getProductReviews(request, response) {
    try {
        const { productId } = request.body

        if (!productId) {
            return response.status(400).json({
                message: "productId is required",
                error: true,
                success: false
            })
        }

        const reviews = await ReviewModel.find({ productId }).sort({ createdAt: -1 })

        const avgRating = reviews.length
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : 0

        return response.json({
            message: "Reviews fetched",
            error: false,
            success: true,
            data: reviews,
            avgRating: parseFloat(avgRating),
            totalReviews: reviews.length
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Delete a review (only owner)
export async function deleteReview(request, response) {
    try {
        const userId = request.userId
        const { reviewId } = request.body

        const review = await ReviewModel.findOne({ _id: reviewId, userId })
        if (!review) {
            return response.status(404).json({
                message: "Review not found or not authorized",
                error: true,
                success: false
            })
        }

        await ReviewModel.deleteOne({ _id: reviewId })

        return response.json({
            message: "Review deleted",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}