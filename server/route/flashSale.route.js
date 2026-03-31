import { Router } from 'express'
import auth from '../middleware/auth.js'
import admin from '../middleware/Admin.js'
import {
    startFlashSale,
    endExpiredFlashSales,
    getActiveFlashSales
} from '../controllers/flashSale.controller.js'

const flashSaleRouter = Router()

flashSaleRouter.post('/start',       auth, admin, startFlashSale)
flashSaleRouter.get('/end-expired',  endExpiredFlashSales)
flashSaleRouter.get('/active',       getActiveFlashSales)

export default flashSaleRouter