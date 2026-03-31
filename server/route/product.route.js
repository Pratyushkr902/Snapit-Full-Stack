import { Router } from 'express'
import auth from '../middleware/auth.js'
import { 
    createProductController, 
    deleteProductDetails, 
    getProductByCategory, 
    getProductByCategoryAndSubCategory, 
    getProductController, 
    getProductDetails, 
    searchProduct, 
    updateProductDetails,
    getFrequentlyBought // ADDED: Controller for Recommendation Engine
} from '../controllers/product.controller.js'
import { admin } from '../middleware/Admin.js'

const productRouter = Router()

// --- CREATE & READ ---
productRouter.post("/create", auth, admin, createProductController)
productRouter.post('/get', getProductController)
productRouter.post("/get-product-by-category", getProductByCategory)

// FIXED: Corrected spelling and removed duplicate entry
productRouter.post('/get-product-by-category-and-subcategory', getProductByCategoryAndSubCategory)

productRouter.post('/get-product-details', getProductDetails)

// --- RECOMMENDATION SYSTEM ---
// This fuels the "People also bought" section on your product pages
productRouter.get('/frequently-bought', getFrequentlyBought)

// --- UPDATE & DELETE ---
productRouter.put('/update-product-details', auth, admin, updateProductDetails)

// Note: Ensure your frontend Axios call uses 'DELETE' method to match this
productRouter.delete('/delete-product', auth, admin, deleteProductDetails)

// --- SEARCH ---
productRouter.post('/search-product', searchProduct)

export default productRouter