import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import {
    getWallet,
    addMoneyToWallet,
    payWithWallet,
    requestWithdrawal,
    listWithdrawals,
    approveWithdrawal,
    rejectWithdrawal
} from '../controllers/wallet.controller.js'

const walletRouter = Router()

// --- WALLET ENDPOINTS ---
// Base Path in index.js: /api/wallet
walletRouter.get('/get',          auth, getWallet)      // GET /api/wallet/get
walletRouter.post('/add-money',   auth, addMoneyToWallet) // POST /api/wallet/add-money
walletRouter.post('/pay',         auth, payWithWallet)   // POST /api/wallet/pay
walletRouter.post('/withdraw',    auth, requestWithdrawal) // POST /api/wallet/withdraw

// --- ADMIN: WITHDRAWAL MANAGEMENT (manual UPI payout approval) ---
walletRouter.get('/admin/withdrawals',          auth, admin, listWithdrawals)
walletRouter.post('/admin/withdrawals/approve', auth, admin, approveWithdrawal)
walletRouter.post('/admin/withdrawals/reject',  auth, admin, rejectWithdrawal)

export default walletRouter