import SubCategoryModel from "../models/subCategory.model.js";
import mongoose from "mongoose";
import NodeCache from "node-cache";

const subCategoryCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

export const AddSubCategoryController = async(request,response)=>{
    try {
        const { name, image, category } = request.body 

        if(!name || !image || !category || !Array.isArray(category) || category.length === 0){
            return response.status(400).json({
                message : "Provide name, image asset, and at least one valid parent category reference array item.",
                error : true,
                success : false
            })
        }

        const payload = {
            name,
            image,
            category
        }

        const createSubCategory = new SubCategoryModel(payload)
        const save = await createSubCategory.save()
        subCategoryCache.flushAll()

        return response.json({
            message : "Sub Category Created",
            data : save,
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

export const getSubCategoryController = async(request,response)=>{
    try {
        const cached = subCategoryCache.get('all_subcategories')
        if (cached) {
            return response.json({
                message : "Sub Category data",
                data : cached,
                error : false,
                success : true,
                cached: true
            })
        }

        const data = await SubCategoryModel.find().sort({createdAt : -1}).populate('category').lean()
        subCategoryCache.set('all_subcategories', data)

        return response.json({
            message : "Sub Category data",
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

export const updateSubCategoryController = async(request,response)=>{
    try {
        const { _id, name, image, category } = request.body 

        if(!_id || !mongoose.Types.ObjectId.isValid(_id)){
            return response.status(400).json({
                message : "Provide valid sub-category _id reference context.",
                error : true,
                success : false
            })
        }

        const updateSubCategory = await SubCategoryModel.findByIdAndUpdate(_id, {
            name,
            image,
            category
        }, { new: true })

        if(!updateSubCategory){
            return response.status(404).json({
                message : "Sub-category target record could not be found.",
                error : true,
                success : false
            })
        }

        subCategoryCache.flushAll()

        return response.json({
            message : 'Updated Successfully',
            data : updateSubCategory,
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

export const deleteSubCategoryController = async(request,response)=>{
    try {
        const { _id } = request.body 
        
        if(!_id || !mongoose.Types.ObjectId.isValid(_id)){
            return response.status(400).json({
                message : "Provide valid target selection _id.",
                error : true,
                success : false
            })
        }

        const deleteSub = await SubCategoryModel.findByIdAndDelete(_id)
        subCategoryCache.flushAll()

        return response.json({
            message : "Delete successfully",
            data : deleteSub,
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