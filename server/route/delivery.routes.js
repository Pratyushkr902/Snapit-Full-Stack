import express from "express";
import auth from "../middleware/auth.js";
import { rider } from "../middleware/Admin.js";
import { markDelivered, getDeliveryProof } from "../controllers/delivery.controller.js";

const router = express.Router();

// Rider calls this to mark order delivered + upload proof photo
router.post("/mark-delivered", auth, rider, markDelivered);

// Admin calls this to view proof photo when reviewing a refund
router.get("/proof/:orderId",  auth, getDeliveryProof);

export default router;