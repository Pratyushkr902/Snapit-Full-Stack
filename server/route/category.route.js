import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'   // ✅ add this
import { AddCategoryController, deleteCategoryController, getCategoryController, updateCategoryController } from '../controllers/category.controller.js'

const categoryRouter = Router()

categoryRouter.post("/add-category", auth, admin, AddCategoryController)  // ✅ add admin
categoryRouter.get('/get', getCategoryController)                          // ✅ public - fine
categoryRouter.put('/update', auth, admin, updateCategoryController)       // ✅ add admin
categoryRouter.delete("/delete", auth, admin, deleteCategoryController)    // ✅ add admin

export default categoryRouter