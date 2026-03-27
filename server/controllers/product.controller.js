import ProductModel from "../models/product.model.js";
import mongoose from "mongoose"; // REQUIRED: For ID validation

// HELPER: Ensures all image URLs are secure for Android/Mobile compatibility
const secureImages = (images) => {
    if (!Array.isArray(images)) return images;
    return images.map(img => typeof img === 'string' ? img.replace("http://", "https://") : img);
};

export const createProductController = async(request,response)=>{
    try {
        const { 
            name ,
            image ,
            category,
            subCategory,
            unit,
            stock,
            price,
            discount,
            description,
            more_details,
        } = request.body 

        // Ensure critical fields are present
        if(!name || !image[0] || !category[0] || !subCategory[0] || !unit || !price || !description ){
            return response.status(400).json({
                message : "Enter required fields",
                error : true,
                success : false
            })
        }

        // FIXED: Mapping the 'stock' input to the new Multi-Mart store_inventory structure
        const productData = {
            name ,
            image : secureImages(image), // Apply HTTPS fix on creation
            category,
            subCategory,
            unit,
            price,
            discount,
            description,
            more_details,
            stock: Number(stock) || 0,
            store_inventory: [
                {
                    store_name: "Snapit Main Store - Paliganj",
                    stock: Number(stock) || 0,
                    isAvailable: true
                }
            ]
        }

        const product = new ProductModel(productData)
        const saveProduct = await product.save()

        return response.json({
            message : "Product Created Successfully with Multi-Mart tracking",
            data : saveProduct,
            error : false,
            success : true
        })

    } catch (error) {
        console.error("CREATE PRODUCT ERROR:", error);
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getProductController = async(request,response)=>{
    try {
        let { page, limit, search } = request.body 

        if(!page) page = 1
        if(!limit) limit = 10

        const query = search ? {
            $text : { $search : search }
        } : {}

        const skip = (page - 1) * limit

        const [data,totalCount] = await Promise.all([
            ProductModel.find(query).sort({createdAt : -1 }).skip(skip).limit(limit).populate('category subCategory'),
            ProductModel.countDocuments(query)
        ])

        // Apply HTTPS fix to all images in the list
        const securedData = data.map(prod => ({
            ...prod._doc,
            image: secureImages(prod.image)
        }));

        return response.json({
            message : "Product data",
            error : false,
            success : true,
            totalCount : totalCount,
            totalNoPage : Math.ceil( totalCount / limit),
            data : securedData
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getProductByCategory = async(request,response)=>{
    try {
        const { id } = request.body 

        if(!id){
            return response.status(400).json({
                message : "provide category id",
                error : true,
                success : false
            })
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response.status(400).json({
                message: "Invalid Category ID",
                error: true,
                success: false
            })
        }

        const product = await ProductModel.find({ 
            category : { $in : id }
        }).limit(15)

        const securedData = product.map(prod => ({
            ...prod._doc,
            image: secureImages(prod.image)
        }));

        return response.json({
            message : "category product list",
            data : securedData,
            error : false,
            success : true
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getProductByCategoryAndSubCategory  = async(request,response)=>{
    try {
        let { categoryId, subCategoryId, page, limit } = request.body

        if(!categoryId){
            return response.status(400).json({
                message : "Provide categoryId",
                error : true,
                success : false
            })
        }

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return response.status(400).json({
                message: "Invalid Category ID format",
                error: true,
                success: false
            })
        }

        if(!page) page = 1
        if(!limit) limit = 10

        const query = {
            category : { $in : [categoryId] }
        }

        if(subCategoryId && subCategoryId !== "all" && mongoose.Types.ObjectId.isValid(subCategoryId)){
            query.subCategory = { $in : [subCategoryId] }
        }

        const skip = (page - 1) * limit

        const [data,dataCount] = await Promise.all([
            ProductModel.find(query).sort({createdAt : -1 }).skip(skip).limit(limit).populate('category subCategory'),
            ProductModel.countDocuments(query)
        ])

        const securedData = data.map(prod => ({
            ...prod._doc,
            image: secureImages(prod.image)
        }));

        return response.json({
            message : "Product list",
            data : securedData,
            totalCount : dataCount,
            page : page,
            limit : limit,
            success : true,
            error : false
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getProductDetails = async(request,response)=>{
    try {
        const { productId } = request.body 

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return response.status(400).json({
                message: "Invalid Product ID",
                error: true,
                success: false
            })
        }

        const product = await ProductModel.findOne({ _id : productId }).populate('category').populate('subCategory');

        if(!product){
            return response.status(404).json({
                message: "Product not found",
                error: true,
                success: false
            })
        }

        // Apply HTTPS fix to single product details
        const securedProduct = {
            ...product._doc,
            image: secureImages(product.image)
        };

        return response.json({
            message : "product details",
            data : securedProduct,
            error : false,
            success : true
        })

    } catch (error) {
        console.error("GET PRODUCT DETAILS ERROR:", error);
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const updateProductDetails = async(request,response)=>{
    try {
        const { _id, ...updateFields } = request.body 

        if(!_id || !mongoose.Types.ObjectId.isValid(_id)){
            return response.status(400).json({
                message : "provide valid product _id",
                error : true,
                success : false
            })
        }

        // If images are updated, ensure they are secured
        if(updateFields.image) {
            updateFields.image = secureImages(updateFields.image);
        }

        const updateProduct = await ProductModel.findOneAndUpdate(
            { _id : _id },
            { $set: updateFields },
            { new: true, runValidators: true }
        ).populate('category subCategory')

        return response.json({
            message : "updated successfully",
            data : updateProduct,
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const deleteProductDetails = async(request,response)=>{
    try {
        const { _id } = request.body 

        if(!_id || !mongoose.Types.ObjectId.isValid(_id)){
            return response.status(400).json({
                message : "provide valid _id ",
                error : true,
                success : false
            })
        }

        const deleteProduct = await ProductModel.deleteOne({_id : _id })

        return response.json({
            message : "Delete successfully",
            error : false,
            success : true,
            data : deleteProduct
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const searchProduct = async(request,response)=>{
    try {
        let { search, page , limit } = request.body 

        if(!page) page = 1
        if(!limit) limit  = 10

        const query = search ? {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ]
        } : {}

        const skip = ( page - 1) * limit

        const [data,dataCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt  : -1 }).skip(skip).limit(limit).populate('category subCategory'),
            ProductModel.countDocuments(query)
        ])

        const securedData = data.map(prod => ({
            ...prod._doc,
            image: secureImages(prod.image)
        }));

        return response.json({
            message : "Product data",
            error : false,
            success : true,
            data : securedData,
            totalCount :dataCount,
            totalPage : Math.ceil(dataCount/limit),
            page : page,
            limit : limit 
        })


    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}