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
    republishAllProducts,
    getVariantsByGroup,
    getSellerProductsController,
} from '../controllers/product.controller.js';
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'

const productRouter = express.Router();

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
productRouter.get('/recalculate-mrp',                      auth, admin, recalculateMRP);
productRouter.get('/pricing-breakdown',                    auth, admin, getPricingBreakdown);
productRouter.post('/republish-all',                       auth, admin, republishAllProducts);
productRouter.post('/get-variants',                               getVariantsByGroup);
productRouter.post('/get-seller-products',                 auth,        getSellerProductsController);

export default productRouter;