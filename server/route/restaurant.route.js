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
import Admin from '../middleware/Admin.js'

const restaurantRouter = Router()

// Public
restaurantRouter.get('/all', getAllRestaurants)
restaurantRouter.get('/:id', getRestaurantById)

// Admin protected
restaurantRouter.post('/create', Admin, createRestaurant)
restaurantRouter.patch('/update/:id', Admin, updateRestaurant)
restaurantRouter.post('/food-item/create', Admin, createFoodItem)
restaurantRouter.patch('/food-item/update/:id', Admin, updateFoodItem)
restaurantRouter.get('/food-items/:restaurantId', Admin, getFoodItemsByRestaurant)

// Dev seed route (remove in production)
restaurantRouter.post('/dev/seed', seedDemoRestaurants)

export default restaurantRouter