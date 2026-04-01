import { Router } from 'express'
import auth from '../middleware/auth.js'
import {
    getWallet,
    addMoneyToWallet,
    payWithWallet
} from '../controllers/wallet.controller.js'

const walletRouter = Router()

// --- WALLET ENDPOINTS ---
// Base Path in index.js: /api/wallet
walletRouter.get('/get',          auth, getWallet)      // GET /api/wallet/get
walletRouter.post('/add-money',   auth, addMoneyToWallet) // POST /api/wallet/add-money
walletRouter.post('/pay',         auth, payWithWallet)   // POST /api/wallet/pay

export default walletRouter