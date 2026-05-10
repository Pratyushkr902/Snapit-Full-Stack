import UserModel from '../models/user.model.js'

// Toggle product in wishlist (add if not there, remove if there)
export async function toggleWishlist(request, response) {
    try {
        const userId = request.userId
        const { productId } = request.body

        if (!productId) {
            return response.status(400).json({
                message: "productId is required",
                error: true,
                success: false
            })
        }

        const user = await UserModel.findById(userId)
        const isWishlisted = user.wishlist.some(id => id.toString() === productId)

        if (isWishlisted) {
            // Remove from wishlist
            await UserModel.findByIdAndUpdate(userId, {
                $pull: { wishlist: productId }
            })
            return response.json({
                message: "Removed from wishlist",
                error: false,
                success: true,
                wishlisted: false
            })
        } else {
            // Add to wishlist
            await UserModel.findByIdAndUpdate(userId, {
                $addToSet: { wishlist: productId }
            })
            return response.json({
                message: "Added to wishlist",
                error: false,
                success: true,
                wishlisted: true
            })
        }
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Get user's wishlist with product details
export async function getWishlist(request, response) {
    try {
        const userId = request.userId

        const user = await UserModel.findById(userId)
            .populate('wishlist')
            .select('wishlist')

        return response.json({
            message: "Wishlist fetched",
            error: false,
            success: true,
            data: user.wishlist || []
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}