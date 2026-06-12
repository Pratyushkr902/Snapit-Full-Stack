import { Router } from 'express'
import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  createFoodItem,
  updateFoodItem,
  getFoodItemsByRestaurant,
  seedDemoRestaurants,
} from '../controllers/restaurant.controller.js'
import { admin } from '../middleware/Admin.js'

const restaurantRouter = Router()

// Public
restaurantRouter.get('/all', getAllRestaurants)
restaurantRouter.get('/:id', getRestaurantById)

// Admin protected
restaurantRouter.post('/create', admin, createRestaurant)
restaurantRouter.patch('/update/:id', admin, updateRestaurant)
restaurantRouter.post('/food-item/create', admin, createFoodItem)
restaurantRouter.patch('/food-item/update/:id', admin, updateFoodItem)
restaurantRouter.get('/food-items/:restaurantId', admin, getFoodItemsByRestaurant)

// Dev seed route (remove in production)
restaurantRouter.post('/dev/seed', seedDemoRestaurants)

export default restaurantRouter