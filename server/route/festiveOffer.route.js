import { Router } from "express";
import auth from "../middleware/auth.js";
import { superAdmin } from "../middleware/superAdmin.js";
import {
  getFestiveOfferController,
  updateFestiveOfferController,
} from "../controllers/festiveOffer.controller.js";

const festiveOfferRouter = Router();

// Public: Customers and app fetch current banner & countdown
festiveOfferRouter.get("/current", getFestiveOfferController);

// Protected: Super Admin updates banner state, times, & settings
festiveOfferRouter.post("/update", auth, superAdmin, updateFestiveOfferController);

export default festiveOfferRouter;
