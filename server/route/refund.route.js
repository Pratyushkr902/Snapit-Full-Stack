import express from "express";
import auth from "../middleware/auth.js";
import {
    submitRefund,
    getMyRefunds,
    getAllRefunds,
    resolveRefund,
} from "../controllers/refund.controller.js";

const router = express.Router();

router.post("/submit",  auth, submitRefund);
router.get("/my",       auth, getMyRefunds);
router.get("/all",      auth, getAllRefunds);
router.post("/resolve", auth, resolveRefund);

export default router;
