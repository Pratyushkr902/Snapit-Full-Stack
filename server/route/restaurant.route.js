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

// ── Admin only — static paths first (must be before /:id) ────────────────────
restaurantRouter.post('/create',                  admin,       createRestaurant)
restaurantRouter.post('/food-item/create',        admin,       createFoodItem)
restaurantRouter.patch('/food-item/update/:id',   admin,       updateFoodItem)
restaurantRouter.get('/food-items/:restaurantId', admin,       getFoodItemsByRestaurant)

// Menu item writes — ADMIN or RESTO_SELLER
restaurantRouter.put('/menu/:itemId',             restoSeller, updateMenuItem)
restaurantRouter.delete('/menu/:itemId',          restoSeller, deleteMenuItem)

// Dev seed (remove in production)
restaurantRouter.post('/dev/seed', seedDemoRestaurants)

// ── Dynamic :id routes — must come AFTER all static paths ────────────────────
restaurantRouter.get('/:id',            getRestaurantById)
restaurantRouter.patch('/update/:id',   admin,       updateRestaurant)
restaurantRouter.get('/:id/menu',       restoSeller, getMenuItems)   // admin panel menu read
restaurantRouter.post('/:id/menu',      restoSeller, addMenuItem)    // add item

export default restaurantRouter