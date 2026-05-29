import ProductModel from "../models/product.model.js";
import mongoose from "mongoose";

const secureImages = (images) => {
    if (!Array.isArray(images)) return images;
    return images.map(img => typeof img === 'string' ? img.replace("http://", "https://") : img);
};

const LIST_FIELDS = 'name image category subCategory unit price discount stock';

export const createProductController = async(request,response)=>{
    try {
        const { name, image, category, subCategory, unit, stock, price, discount, description, more_details } = request.body
        if(!name || !image[0] || !category[0] || !subCategory[0] || !unit || !price || !description){
            return response.status(400).json({ message: "Enter required fields", error: true, success: false })
        }
        const product = new ProductModel({
            name, image: secureImages(image), category, subCategory, unit, price, discount, description, more_details,
            stock: Number(stock) || 0,
            store_inventory: [{ store_name: "Snapit Main Store - Paliganj", stock: Number(stock) || 0, isAvailable: true }]
        })
        const saveProduct = await product.save()
        return response.json({ message: "Product Created Successfully", data: saveProduct, error: false, success: true })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const getProductController = async(request,response)=>{
    try {
        let { page, limit, search } = request.body
        if(!page) page = 1
        if(!limit) limit = 10
        const query = search ? { $text: { $search: search } } : {}
        const skip = (page - 1) * limit
        const [data, totalCount] = await Promise.all([
            ProductModel.find(query).sort({createdAt: -1}).skip(skip).limit(limit).populate('category subCategory'),
            ProductModel.countDocuments(query)
        ])
        return response.json({
            message: "Product data", error: false, success: true,
            totalCount, totalNoPage: Math.ceil(totalCount / limit),
            data: data.map(prod => ({ ...prod._doc, image: secureImages(prod.image) }))
        })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const getProductByCategory = async(request,response)=>{
    try {
        const { id } = request.body
        if(!id) return response.status(400).json({ message: "provide category id", error: true, success: false })
        if(!mongoose.Types.ObjectId.isValid(id)) return response.status(400).json({ message: "Invalid Category ID", error: true, success: false })
        const product = await ProductModel.find({ category: { $in: id } }).select(LIST_FIELDS).limit(15).lean()
        return response.json({
            message: "category product list", error: false, success: true,
            data: product.map(prod => ({ ...prod, image: secureImages(prod.image) }))
        })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const getProductsByCategories = async(request, response) => {
    try {
        const { categoryIds } = request.body
        if(!Array.isArray(categoryIds) || categoryIds.length === 0)
            return response.status(400).json({ message: "Provide an array of categoryIds", error: true, success: false })
        const invalidId = categoryIds.find(id => !mongoose.Types.ObjectId.isValid(id))
        if(invalidId) return response.status(400).json({ message: `Invalid category ID: ${invalidId}`, error: true, success: false })
        const products = await ProductModel.find({ category: { $in: categoryIds } }).select(LIST_FIELDS).limit(15 * categoryIds.length).lean()
        const grouped = {}
        for(const categoryId of categoryIds) grouped[categoryId] = []
        for(const prod of products){
            const securedProd = { ...prod, image: secureImages(prod.image) }
            for(const catId of prod.category){
                const key = catId.toString()
                if(grouped[key] && grouped[key].length < 15) grouped[key].push(securedProd)
            }
        }
        return response.json({ message: "Products grouped by category", data: grouped, error: false, success: true })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const getProductByCategoryAndSubCategory = async(request,response)=>{
    try {
        let { categoryId, subCategoryId, page, limit } = request.body
        if(!categoryId) return response.status(400).json({ message: "Provide categoryId", error: true, success: false })
        if(!mongoose.Types.ObjectId.isValid(categoryId)) return response.status(400).json({ message: "Invalid Category ID format", error: true, success: false })
        if(!page) page = 1
        if(!limit) limit = 10
        const query = { category: { $in: [categoryId] } }
        if(subCategoryId && subCategoryId !== "all" && mongoose.Types.ObjectId.isValid(subCategoryId))
            query.subCategory = { $in: [subCategoryId] }
        const skip = (page - 1) * limit
        const [data, dataCount] = await Promise.all([
            ProductModel.find(query).sort({createdAt: -1}).skip(skip).limit(limit).populate('category subCategory'),
            ProductModel.countDocuments(query)
        ])
        return response.json({
            message: "Product list", success: true, error: false,
            data: data.map(prod => ({ ...prod._doc, image: secureImages(prod.image) })),
            totalCount: dataCount, page, limit
        })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const getProductDetails = async(request,response)=>{
    try {
        const { productId } = request.body
        if(!productId || !mongoose.Types.ObjectId.isValid(productId))
            return response.status(400).json({ message: "Invalid Product ID", error: true, success: false })
        const product = await ProductModel.findOne({ _id: productId }).populate('category').populate('subCategory')
        if(!product) return response.status(404).json({ message: "Product not found", error: true, success: false })
        return response.json({
            message: "product details", error: false, success: true,
            data: { ...product._doc, image: secureImages(product.image) }
        })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const updateProductDetails = async(request,response)=>{
    try {
        const { _id, ...updateFields } = request.body
        if(!_id || !mongoose.Types.ObjectId.isValid(_id))
            return response.status(400).json({ message: "provide valid product _id", error: true, success: false })
        if(updateFields.image) updateFields.image = secureImages(updateFields.image)
        const updateProduct = await ProductModel.findOneAndUpdate({ _id }, { $set: updateFields }, { new: true, runValidators: true }).populate('category subCategory')
        return response.json({ message: "updated successfully", data: updateProduct, error: false, success: true })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const deleteProductDetails = async(request,response)=>{
    try {
        const { _id } = request.body
        if(!_id || !mongoose.Types.ObjectId.isValid(_id))
            return response.status(400).json({ message: "provide valid _id", error: true, success: false })
        const deleteProduct = await ProductModel.deleteOne({ _id })
        return response.json({ message: "Delete successfully", error: false, success: true, data: deleteProduct })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const searchProduct = async(request,response)=>{
    try {
        let { search, page, limit } = request.body
        if(!page) page = 1
        if(!limit) limit = 10
        const query = search ? { $or: [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }] } : {}
        const skip = (page - 1) * limit
        const [data, dataCount] = await Promise.all([
            ProductModel.find(query).sort({createdAt: -1}).skip(skip).limit(limit).populate('category subCategory'),
            ProductModel.countDocuments(query)
        ])
        return response.json({
            message: "Product data", error: false, success: true,
            data: data.map(prod => ({ ...prod._doc, image: secureImages(prod.image) })),
            totalCount: dataCount, totalPage: Math.ceil(dataCount/limit), page, limit
        })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export async function getFrequentlyBought(req, res) {
    try {
        const { productId } = req.query
        if(!productId || !mongoose.Types.ObjectId.isValid(productId))
            return res.status(400).json({ success: false, message: 'Valid Product ID required' })
        const product = await ProductModel.findById(productId)
        if(!product) return res.status(404).json({ success: false, message: 'Product not found' })
        const suggestions = await ProductModel.find({ category: { $in: product.category }, _id: { $ne: productId } }).select(LIST_FIELDS).limit(5).lean()
        return res.json({ success: true, data: suggestions.map(prod => ({ ...prod, image: secureImages(prod.image) })) })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

export const updateProductEmails = async(req, res) => {
    try {
        const result = await ProductModel.updateMany(
            { description: { $regex: "info@blinkit.com", $options: "i" } },
            [{ $set: { description: { $replaceOne: { input: "$description", find: "info@blinkit.com", replacement: "info@snapit.com" } } } }]
        )
        return res.json({ message: `Successfully updated ${result.modifiedCount} products.`, success: true, error: false })
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false })
    }
}
