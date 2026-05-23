// Product Controller - Optimized for Render Free Tier (512MB RAM)
import ProductModel from '../models/product.model.js'

/**
 * Get products by category
 * Optimized to prevent memory crashes on free tier hosting
 */
export async function getProductByCategory(req, res) {
    try {
        const { id } = req.body // Category ID(s)

        if (!id) {
            return res.status(400).json({
                message: "Category ID is required",
                error: true,
                success: false
            })
        }

        // Convert single ID to array for consistent handling
        const categoryIds = Array.isArray(id) ? id : [id]

        // CRITICAL OPTIMIZATION: Use .lean() to return plain JS objects
        // This uses ~80% less memory than full Mongoose documents
        const products = await ProductModel.find({
            category: { $in: categoryIds }
        })
        .select('name price sellingPrice productImage category stock unit') // Only fetch needed fields
        .limit(15) // Limit results per category to prevent huge responses
        .lean() // CRITICAL: Returns plain objects instead of Mongoose documents
        .exec()

        return res.json({
            message: "Products fetched successfully",
            data: products,
            error: false,
            success: true
        })

    } catch (error) {
        console.error('getProductByCategory error:', error)
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        })
    }
}

/**
 * Get products by subcategory
 * Optimized with pagination to prevent memory issues
 */
export async function getProductBySubCategory(req, res) {
    try {
        const { id, page = 1, limit = 20 } = req.body

        if (!id) {
            return res.status(400).json({
                message: "Subcategory ID is required",
                error: true,
                success: false
            })
        }

        const subcategoryIds = Array.isArray(id) ? id : [id]
        const skip = (page - 1) * limit

        const products = await ProductModel.find({
            subCategory: { $in: subcategoryIds }
        })
        .select('name price sellingPrice productImage category subCategory stock unit')
        .skip(skip)
        .limit(limit)
        .lean() // Memory optimization
        .exec()

        const totalCount = await ProductModel.countDocuments({
            subCategory: { $in: subcategoryIds }
        })

        return res.json({
            message: "Products fetched successfully",
            data: products,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            error: false,
            success: true
        })

    } catch (error) {
        console.error('getProductBySubCategory error:', error)
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        })
    }
}

/**
 * Get single product details
 * Optimized with minimal population
 */
export async function getProductDetails(req, res) {
    try {
        const { id } = req.body

        if (!id) {
            return res.status(400).json({
                message: "Product ID is required",
                error: true,
                success: false
            })
        }

        const product = await ProductModel.findById(id)
            .populate('category', 'name') // Only populate needed fields
            .populate('subCategory', 'name')
            .lean()
            .exec()

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                error: true,
                success: false
            })
        }

        return res.json({
            message: "Product details fetched",
            data: product,
            error: false,
            success: true
        })

    } catch (error) {
        console.error('getProductDetails error:', error)
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        })
    }
}

/**
 * Search products with text search
 * Optimized with pagination and field selection
 */
export async function searchProducts(req, res) {
    try {
        const { q, page = 1, limit = 20, category, subCategory } = req.body

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                message: "Search query must be at least 2 characters",
                error: true,
                success: false
            })
        }

        const skip = (page - 1) * limit
        const searchRegex = new RegExp(q, 'i')

        // Build query
        const query = {
            $or: [
                { name: searchRegex },
                { description: searchRegex }
            ]
        }

        if (category) query.category = category
        if (subCategory) query.subCategory = subCategory

        const products = await ProductModel.find(query)
            .select('name price sellingPrice productImage category stock unit')
            .skip(skip)
            .limit(limit)
            .lean()
            .exec()

        const totalCount = await ProductModel.countDocuments(query)

        return res.json({
            message: "Search results",
            data: products,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            error: false,
            success: true
        })

    } catch (error) {
        console.error('searchProducts error:', error)
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        })
    }
}