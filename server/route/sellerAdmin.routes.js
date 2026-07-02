import { Router } from "express";
import auth from "../middleware/auth.js";
import {
    listSellersController,
    getSellerOrdersController,
    getSellerEarningsController,
    getSellerProductsController,
    updateSellerProductController
} from "../controllers/sellerAdmin.controller.js";

const sellerAdminRouter = Router();

sellerAdminRouter.get("/sellers", auth, listSellersController);
sellerAdminRouter.get("/sellers/:sellerId/orders", auth, getSellerOrdersController);
sellerAdminRouter.get("/sellers/:sellerId/earnings", auth, getSellerEarningsController);
sellerAdminRouter.get("/sellers/:sellerId/products", auth, getSellerProductsController);
sellerAdminRouter.put("/sellers/:sellerId/products/:productId", auth, updateSellerProductController);

export default sellerAdminRouter;
