import { Router } from 'express'
import auth from '../middleware/auth.js'
import {
    getWallet,
    addMoneyToWallet,
    payWithWallet
} from '../controllers/wallet.controller.js'

const walletRouter = Router()

walletRouter.get('/get',          auth, getWallet)
walletRouter.post('/add-money',   auth, addMoneyToWallet)
walletRouter.post('/pay',         auth, payWithWallet)

export default walletRouter