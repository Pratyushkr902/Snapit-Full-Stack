import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js' // FIXED: Matches named export in Admin.js
import {
    startFlashSale,
    endExpiredFlashSales,
    getActiveFlashSales
} from '../controllers/flashSale.controller.js'

const flashSaleRouter = Router()

// --- FLASH SALE ENDPOINTS ---
// GET https://snapit-full-stack.onrender.com/api/flash-sale/active
flashSaleRouter.post('/start',       auth, admin, startFlashSale)
flashSaleRouter.get('/end-expired',  endExpiredFlashSales)
flashSaleRouter.get('/active',       getActiveFlashSales)

export default flashSaleRouter