import express from 'express';
import {
    createProductController,
    getProductController,
    getProductByCategory,
    getProductsByCategories,
    getProductByCategoryAndSubCategory,
    getProductDetails,
    updateProductDetails,
    deleteProductDetails,
    searchProduct,
    getFrequentlyBought,
    updateProductEmails,
    recalculateMRP,
    getPricingBreakdown,
} from '../controllers/product.controller.js';
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'

const productRouter = express.Router();

// ── Existing routes ──────────────────────────────────────────
productRouter.post('/create',                              auth, admin, createProductController);
productRouter.post('/get',                                        getProductController);
productRouter.post('/get-product-by-category',                    getProductByCategory);
productRouter.post('/get-products-by-categories',                 getProductsByCategories);
productRouter.post('/get-product-by-category-and-subcategory',    getProductByCategoryAndSubCategory);
productRouter.post('/get-product-details',                        getProductDetails);
productRouter.put('/update-product-details',               auth, admin, updateProductDetails);
productRouter.delete('/delete-product',                    auth, admin, deleteProductDetails);
productRouter.post('/search-product',                             searchProduct);
productRouter.get('/frequently-bought',                           getFrequentlyBought);
productRouter.post('/fix-emails',                          auth, admin, updateProductEmails);

// ── NEW: Pricing & MRP routes ────────────────────────────────
// Manually trigger MRP recalculation for all products
productRouter.get('/recalculate-mrp',   auth, admin, recalculateMRP);
// Get full pricing breakdown (admin panel)
productRouter.get('/pricing-breakdown', auth, admin, getPricingBreakdown);

export default productRouter;