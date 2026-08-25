import { Router } from "express";
import auth from "../middleware/auth.js";
import { 
    AddSubCategoryController, 
    deleteSubCategoryController, 
    getSubCategoryController, 
    updateSubCategoryController 
} from "../controllers/subCategory.controller.js";

const subCategoryRouter = Router()

// Create a new sub-category (Requires Admin Auth)
subCategoryRouter.post('/create', auth, AddSubCategoryController)

// Get all sub-categories (Supports both GET and POST for optimal caching and compatibility)
subCategoryRouter.get('/get', getSubCategoryController)
subCategoryRouter.post('/get', getSubCategoryController)

// Update sub-category (Requires Admin Auth)
subCategoryRouter.put('/update', auth, updateSubCategoryController)

// Delete sub-category (Requires Admin Auth)
subCategoryRouter.delete('/delete', auth, deleteSubCategoryController)

export default subCategoryRouter