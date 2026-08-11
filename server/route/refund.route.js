import express from "express";
import auth from "../middleware/auth.js";
import { admin } from "../middleware/Admin.js";
import {
    submitRefund,
    getMyRefunds,
    getAllRefunds,
    resolveRefund,
} from "../controllers/refund.controller.js";

const router = express.Router();

router.post("/submit",  auth,        submitRefund);
router.get("/my",       auth,        getMyRefunds);
router.get("/all",      auth, admin, getAllRefunds);   // SECURITY FIX: was accessible to any logged-in user
router.post("/resolve", auth, admin, resolveRefund);   // SECURITY FIX: was accessible to any logged-in user

export default router;
