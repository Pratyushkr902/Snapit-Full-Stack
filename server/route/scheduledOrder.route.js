import { Router } from "express"
import auth from "../middleware/auth.js"
import {
    createScheduledOrderController,
    getMyScheduledOrdersController,
    cancelScheduledOrderController,
    toggleScheduledOrderController,
} from "../controllers/scheduledOrder.controller.js"

const scheduledOrderRouter = Router()

scheduledOrderRouter.post("/create",      auth, createScheduledOrderController)
scheduledOrderRouter.get( "/my-list",     auth, getMyScheduledOrdersController)
scheduledOrderRouter.delete("/:id",       auth, cancelScheduledOrderController)
scheduledOrderRouter.patch("/:id/toggle", auth, toggleScheduledOrderController)

export default scheduledOrderRouter