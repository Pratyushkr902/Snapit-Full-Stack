import ProductModel from '../models/product.model.js'

// Admin: Start a flash sale
export async function startFlashSale(req, res) {
    try {
        const { productId, discountPercent, durationMinutes } = req.body

        if (!productId || !discountPercent || !durationMinutes) {
            return res.status(400).json({
                success: false,
                message: 'All fields required'
            })
        }

        const product = await ProductModel.findById(productId)
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            })
        }

        const startTime = new Date()
        const endTime   = new Date(
            startTime.getTime() + durationMinutes * 60 * 1000
        )

        const discountedPrice = Math.floor(
            product.price * (1 - discountPercent / 100)
        )

        product.flashSale = {
            isActive:        true,
            discountPercent: discountPercent,
            startTime:       startTime,
            endTime:         endTime,
            originalPrice:   product.price
        }
        product.price = discountedPrice

        await product.save()

        return res.json({
            success: true,
            message: `Flash sale started for ${durationMinutes} minutes!`,
            data: {
                product:         product.name,
                originalPrice:   product.flashSale.originalPrice,
                discountedPrice: product.price,
                endsAt:          endTime
            }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

// Auto-end expired flash sales
export async function endExpiredFlashSales(req, res) {
    try {
        const now = new Date()

        const expiredProducts = await ProductModel.find({
            'flashSale.isActive': true,
            'flashSale.endTime':  { $lt: now }
        })

        for (let product of expiredProducts) {
            product.price            = product.flashSale.originalPrice
            product.flashSale.isActive = false
            await product.save()
        }

        return res.json({
            success: true,
            message: `${expiredProducts.length} flash sales ended`
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

// Get all active flash sales
export async function getActiveFlashSales(req, res) {
    try {
        const now = new Date()

        const products = await ProductModel.find({
            'flashSale.isActive': true,
            'flashSale.endTime':  { $gt: now }
        })

        return res.json({
            success: true,
            data: products
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}