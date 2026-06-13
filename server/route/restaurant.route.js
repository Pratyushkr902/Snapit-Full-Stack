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
import { admin, restoSeller } from '../middleware/Admin.js'

const restaurantRouter = Router()

// ── Public ────────────────────────────────────────────────────────────────────
restaurantRouter.get('/all', getAllRestaurants)

// ── Dev seed (remove in production) ──────────────────────────────────────────
restaurantRouter.post('/dev/seed', seedDemoRestaurants)

// ── Admin only — all static paths BEFORE /:id ────────────────────────────────
restaurantRouter.post('/create',                  admin,       createRestaurant)
restaurantRouter.post('/food-item/create',        admin,       createFoodItem)
restaurantRouter.patch('/food-item/update/:id',   admin,       updateFoodItem)
restaurantRouter.get('/food-items/:restaurantId', admin,       getFoodItemsByRestaurant)

// FIX 1: /update/:id must be before /:id — otherwise Express matches /:id first
// and this PATCH never fires correctly
restaurantRouter.patch('/update/:id',             admin,       updateRestaurant)

// ── Menu item writes — ADMIN or RESTO_SELLER ──────────────────────────────────
restaurantRouter.put('/menu/:itemId',             restoSeller, updateMenuItem)
restaurantRouter.delete('/menu/:itemId',          restoSeller, deleteMenuItem)

// ── Dynamic :id routes — MUST be last ────────────────────────────────────────
restaurantRouter.get('/:id',                      getRestaurantById)
restaurantRouter.get('/:id/menu',                 restoSeller, getMenuItems)
restaurantRouter.post('/:id/menu',                restoSeller, addMenuItem)

export default restaurantRouter