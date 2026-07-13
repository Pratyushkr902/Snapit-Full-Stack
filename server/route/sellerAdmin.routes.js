import { Router } from "express";
import auth from "../middleware/auth.js";
import { admin } from "../middleware/Admin.js";
import {
    listSellersController,
    getSellerOrdersController,
    getSellerEarningsController,
    getSellerProductsController,
    updateSellerProductController,
    createSellerProductController,
    deleteSellerProductController
} from "../controllers/sellerAdmin.controller.js";

const sellerAdminRouter = Router();

sellerAdminRouter.get("/sellers", auth, admin, listSellersController);
sellerAdminRouter.get("/sellers/:sellerId/orders", auth, admin, getSellerOrdersController);
sellerAdminRouter.get("/sellers/:sellerId/earnings", auth, admin, getSellerEarningsController);
sellerAdminRouter.get("/sellers/:sellerId/products", auth, admin, getSellerProductsController);
sellerAdminRouter.post("/sellers/:sellerId/products", auth, admin, createSellerProductController);
sellerAdminRouter.put("/sellers/:sellerId/products/:productId", auth, admin, updateSellerProductController);
sellerAdminRouter.delete("/sellers/:sellerId/products/:productId", auth, admin, deleteSellerProductController);

export default sellerAdminRouter;