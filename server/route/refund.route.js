import express from "express";
import auth from "../middleware/auth.js";
import {
    submitRefund,
    getMyRefunds,
    getAllRefunds,
    resolveRefund,
} from "../controllers/refund.controller.js";

const router = express.Router();

router.post("/submit",  auth(["ADMIN","user"]), submitRefund);
router.get("/my",       auth(["ADMIN","user"]), getMyRefunds);
router.get("/all",      auth(["ADMIN"]),        getAllRefunds);
router.post("/resolve", auth(["ADMIN"]),        resolveRefund);

export default router;
