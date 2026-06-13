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
import auth from '../middleware/auth.js'
import { admin, restoSeller } from '../middleware/Admin.js'

const restaurantRouter = Router()

// ── Public ────────────────────────────────────────────────────────────────────
restaurantRouter.get('/all', getAllRestaurants)

// ── Dev seed (remove in production) ──────────────────────────────────────────
restaurantRouter.post('/dev/seed', seedDemoRestaurants)

// ── Admin only — all static paths BEFORE /:id ────────────────────────────────
restaurantRouter.post('/create',                  auth, admin, createRestaurant)
restaurantRouter.post('/food-item/create',        auth, admin, createFoodItem)
restaurantRouter.patch('/food-item/update/:id',   auth, admin, updateFoodItem)
restaurantRouter.get('/food-items/:restaurantId', auth, admin, getFoodItemsByRestaurant)

// FIX: was `admin` — only ADMIN could update a restaurant, locking out RESTO_SELLER owners.
// Changed to `restoSeller` which allows ['RESTO_SELLER', 'ADMIN'].
// The controller's assertOwnership() already ensures a RESTO_SELLER can only update
// their own restaurant (checks resto.ownerId === req.user._id), so this is safe.
restaurantRouter.patch('/update/:id',             auth, restoSeller, updateRestaurant)

// ── Menu item writes — ADMIN or RESTO_SELLER ──────────────────────────────────
restaurantRouter.put('/menu/:itemId',             auth, restoSeller, updateMenuItem)
restaurantRouter.delete('/menu/:itemId',          auth, restoSeller, deleteMenuItem)

// ── Dynamic :id routes — MUST be last ────────────────────────────────────────
restaurantRouter.get('/:id',                      getRestaurantById)
restaurantRouter.get('/:id/menu',                 auth, restoSeller, getMenuItems)
restaurantRouter.post('/:id/menu',                auth, restoSeller, addMenuItem)

export default restaurantRouter