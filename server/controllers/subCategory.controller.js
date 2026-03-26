import SubCategoryModel from "../models/subCategory.model.js";
import mongoose from "mongoose";

export const AddSubCategoryController = async(request,response)=>{
    try {
        const { name, image, category } = request.body 

        // FIXED: Changed && to ||. Previously, it only failed if ALL were missing. 
        // Now it fails if ANY required field is missing.
        if(!name || !image || !category || !category[0] ){
            return response.status(400).json({
                message : "Provide name, image, and at least one category",
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
        // Populating 'category' ensures the frontend table shows names, not just IDs
        const data = await SubCategoryModel.find().sort({createdAt : -1}).populate('category')
        
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
                message : "Provide valid sub-category _id",
                error : true,
                success : false
            })
        }

        // FIXED: Added { new: true } so the response contains the UPDATED data, not the old data
        const updateSubCategory = await SubCategoryModel.findByIdAndUpdate(_id, {
            name,
            image,
            category
        }, { new: true })

        if(!updateSubCategory){
            return response.status(404).json({
                message : "Sub-category not found",
                error : true,
                success : false
            })
        }

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
                message : "Provide valid _id",
                error : true,
                success : false
            })
        }

        const deleteSub = await SubCategoryModel.findByIdAndDelete(_id)

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