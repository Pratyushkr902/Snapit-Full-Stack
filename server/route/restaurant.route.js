import { Router } from 'express'
import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  createFoodItem,
  updateFoodItem,
  getFoodItemsByRestaurant,
  getMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  seedDemoRestaurants,
} from '../controllers/restaurant.controller.js'
import {
  foodOrderCOD,
  foodOrderWallet,
  foodOrderCreatePayment,
  foodOrderVerifyPayment,
} from '../controllers/foodOrder.controller.js'
import auth from '../middleware/auth.js'
import { admin, restoSeller } from '../middleware/Admin.js'

const restaurantRouter = Router()

// ── Public ────────────────────────────────────────────────────────────────────
restaurantRouter.get('/all', getAllRestaurants)

// ── Dev seed (remove in production) ──────────────────────────────────────────
restaurantRouter.post('/dev/seed', auth, admin, seedDemoRestaurants)  // SECURITY FIX: was public

// ── Food Order (customer checkout) ───────────────────────────────────────────
restaurantRouter.post('/food-order/cash-on-delivery', auth, foodOrderCOD)
restaurantRouter.post('/food-order/wallet',           auth, foodOrderWallet)
restaurantRouter.post('/food-order/create-payment',   auth, foodOrderCreatePayment)
restaurantRouter.post('/food-order/verify-payment',   auth, foodOrderVerifyPayment)

// ── Admin only — all static paths BEFORE /:id ────────────────────────────────
restaurantRouter.post('/create',                  auth, admin, createRestaurant)
restaurantRouter.post('/food-item/create',        auth, admin, createFoodItem)
restaurantRouter.patch('/food-item/update/:id',   auth, admin, updateFoodItem)
restaurantRouter.get('/food-items/:restaurantId', auth, admin, getFoodItemsByRestaurant)

restaurantRouter.patch('/update/:id',             auth, restoSeller, updateRestaurant)

// ── Menu item writes — ADMIN or RESTO_SELLER ──────────────────────────────────
restaurantRouter.put('/menu/:itemId',             auth, restoSeller, updateMenuItem)
restaurantRouter.delete('/menu/:itemId',          auth, restoSeller, deleteMenuItem)

// ── Dynamic :id routes — MUST be last ────────────────────────────────────────
restaurantRouter.get('/:id',                      getRestaurantById)
restaurantRouter.get('/:id/menu',                 auth, restoSeller, getMenuItems)
restaurantRouter.post('/:id/menu',                auth, restoSeller, addMenuItem)

export default restaurantRouter