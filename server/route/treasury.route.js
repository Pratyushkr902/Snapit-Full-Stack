import express from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import {
  getTreasurySummary,
  recordDeposit,
  recordWithdrawal,
  distributeCodToWallets,
} from '../controllers/treasury.controller.js'

const treasuryRouter = express.Router()

treasuryRouter.get('/summary', auth, admin, getTreasurySummary)
treasuryRouter.post('/deposit', auth, admin, recordDeposit)
treasuryRouter.post('/withdraw', auth, admin, recordWithdrawal)
treasuryRouter.post('/distribute-cod', auth, admin, distributeCodToWallets)

export default treasuryRouter
