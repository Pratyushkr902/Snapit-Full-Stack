import { Router } from 'express'
import auth from '../middleware/auth.js'
import {
    getReferralInfo,
    applyFirstOrderBonus
} from '../controllers/referral.controller.js'

const referralRouter = Router()

referralRouter.get('/info',               auth, getReferralInfo)
referralRouter.post('/first-order-bonus', auth, applyFirstOrderBonus)

export default referralRouter