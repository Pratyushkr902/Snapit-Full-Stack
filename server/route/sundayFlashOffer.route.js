import { Router } from "express";
import {
  getSundayFlashStatus,
  triggerSundayFlashOffer,
  stopSundayFlashOffer,
  updateSundayFlashSchedule,
} from "../controllers/sundayFlashOffer.controller.js";
import auth from "../middleware/auth.js";
import { admin } from "../middleware/Admin.js";
import jwt from "jsonwebtoken";

const sundayFlashRouter = Router();

// Optional auth middleware so non-logged-in users can still view flash status,
// but logged-in users get their alreadyClaimed check.
const optionalAuth = (req, res, next) => {
  try {
    let token = null;
    const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) {
      token = req.cookies?.accessToken || req.cookies?.accesstoken;
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);
      if (decoded?.id) {
        req.userId = decoded.id;
        req.userRole = decoded.role;
      }
    }
  } catch (e) {
    // Ignore invalid token for public status view
  }
  next();
};

// Admin authentication or API key bypass for internal cron/admin scripts
const adminOrInternalAuth = (req, res, next) => {
  const apiKey = req.headers["x-internal-key"] || req.query.apiKey;
  if (apiKey && apiKey === (process.env.INTERNAL_CRON_KEY || "snapit-sunday-flash-secret-2026")) {
    return next();
  }
  return auth(req, res, () => {
    if (req.userRole === "ADMIN" || req.userRole === "SUPER_ADMIN") {
      return next();
    }
    return res.status(403).json({ success: false, message: "Admin access required." });
  });
};

// Public status endpoint (with optional auth for personal claim check)
sundayFlashRouter.get("/status", optionalAuth, getSundayFlashStatus);

// Trigger 5-minute flash window (Admin or internal cron)
sundayFlashRouter.post("/trigger", adminOrInternalAuth, triggerSundayFlashOffer);

// Stop flash window
sundayFlashRouter.post("/stop", adminOrInternalAuth, stopSundayFlashOffer);

// Super Admin updates scheduled time & rules
sundayFlashRouter.post("/update-schedule", adminOrInternalAuth, updateSundayFlashSchedule);

export default sundayFlashRouter;
