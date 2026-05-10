import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.ObjectId,
        ref: 'product',
        required: true
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
})

// One review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true })

const ReviewModel = mongoose.model('review', reviewSchema)
export default ReviewModel