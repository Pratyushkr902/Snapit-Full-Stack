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
    updateProductDetails 
} from '../controllers/product.controller.js'
import { admin } from '../middleware/Admin.js'

const productRouter = Router()

productRouter.post("/create", auth, admin, createProductController)
productRouter.post('/get', getProductController)
productRouter.post("/get-product-by-category", getProductByCategory)

// FIXED: Corrected spelling from 'get-pruduct' to 'get-product'
productRouter.post('/get-product-by-category-and-subcategory', getProductByCategoryAndSubCategory)

productRouter.post('/get-product-details', getProductDetails)

// update product
productRouter.put('/update-product-details', auth, admin, updateProductDetails)

// delete product
// Note: Ensure your frontend Axios call uses 'DELETE' method to match this
productRouter.delete('/delete-product', auth, admin, deleteProductDetails)

// search product 
productRouter.post('/search-product', searchProduct)

// Ensure this matches the SummaryApi URL exactly
productRouter.post("/get-product-by-category-and-subcategory", getProductByCategoryAndSubCategory);
export default productRouter