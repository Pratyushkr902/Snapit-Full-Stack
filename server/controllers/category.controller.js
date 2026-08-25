import CategoryModel from "../models/category.model.js";
import SubCategoryModel from "../models/subCategory.model.js";
import ProductModel from "../models/product.model.js";
import mongoose from "mongoose";
import NodeCache from "node-cache";

const categoryCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

export const AddCategoryController = async(request,response)=>{
    try {
        const { name, image, icon, imageThumbnail } = request.body 
        const categoryAsset = icon || image;

        if(!name || !categoryAsset){
            return response.status(400).json({
                message : "Category name and an asset image are required fields",
                error : true,
                success : false
            })
        }

        // ✅ FIXED: Saves to both fields so neither old database rows nor new frontend keys break
        const addCategory = new CategoryModel({
            name,
            image: categoryAsset,
            icon: categoryAsset,
            imageThumbnail: imageThumbnail || ""
        })

        const saveCategory = await addCategory.save()

        if(!saveCategory){
            return response.status(500).json({
                message : "Failed to save category document to the collection instance.",
                error : true,
                success : false
            })
        }

        categoryCache.flushAll() // Invalidate cache on mutation

        return response.json({
            message : "Add Category",
            data : saveCategory,
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

export const getCategoryController = async(request,response)=>{
    try {
        const cached = categoryCache.get('all_categories')
        if (cached) {
            return response.json({
                data : cached,
                error : false,
                success : true,
                cached: true
            })
        }

        const data = await CategoryModel.find().sort({ createdAt : -1 }).lean()
        categoryCache.set('all_categories', data)

        return response.json({
            data : data,
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

export const updateCategoryController = async(request,response)=>{
    try {
        const { _id, name, image, icon, imageThumbnail } = request.body 
        const categoryAsset = icon || image;

        if(!_id || !mongoose.Types.ObjectId.isValid(_id)){
            return response.status(400).json({
                message : "Provide a valid category identification parameter.",
                error : true,
                success : false
            })
        }

        // ✅ FIXED: Updates both field references simultaneously to shield mobile models
        const updateFields = {
           name, 
           image: categoryAsset,
           icon: categoryAsset 
        }
        // Only touch imageThumbnail if the frontend actually sent one —
        // avoids wiping an existing thumbnail on unrelated edits (e.g. a
        // name-only update) that don't resend it.
        if (imageThumbnail !== undefined) {
            updateFields.imageThumbnail = imageThumbnail
        }
        const update = await CategoryModel.findByIdAndUpdate(_id, updateFields, { new: true })
        categoryCache.flushAll()

        return response.json({
            message : "Updated Category",
            success : true,
            error : false,
            data : update
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const deleteCategoryController = async(request,response)=>{
    try {
        const { _id } = request.body 

        if(!_id || !mongoose.Types.ObjectId.isValid(_id)){
            return response.status(400).json({
                message : "Invalid Object ID provided.",
                error : true,
                success : false
            })
        }

        const checkSubCategory = await SubCategoryModel.find({
            category : { "$in" : [ _id ] }
        }).countDocuments()

        const checkProduct = await ProductModel.find({
            category : { "$in" : [ _id ] }
        }).countDocuments()

        if(checkSubCategory > 0 || checkProduct > 0 ){
            return response.status(400).json({
                message : "This category is currently mapped to active inventory products or subcategories and cannot be deleted.",
                error : true,
                success : false
            })
        }

        const deleteCategory = await CategoryModel.deleteOne({ _id : _id})
        categoryCache.flushAll()

        return response.json({
            message : "Delete category successfully",
            data : deleteCategory,
            error : false,
            success : true
        })

    } catch (error) {
       return response.status(500).json({
            message : error.message || error,
            success : false,
            error : true
       }) 
    }
}