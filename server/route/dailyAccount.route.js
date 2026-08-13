import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import {
  upsertDailyAccount,
  getDailyAccounts,
  deleteDailyAccount,
} from '../controllers/dailyAccount.controller.js'

const dailyAccountRouter = Router()

dailyAccountRouter.post('/', auth, admin, upsertDailyAccount)
dailyAccountRouter.get('/', auth, admin, getDailyAccounts)
dailyAccountRouter.delete('/:id', auth, admin, deleteDailyAccount)

export default dailyAccountRouter