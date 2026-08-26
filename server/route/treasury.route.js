import express from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import {
  getTreasurySummary,
  recordDeposit,
  recordWithdrawal,
} from '../controllers/treasury.controller.js'

const treasuryRouter = express.Router()

treasuryRouter.get('/summary', auth, admin, getTreasurySummary)
treasuryRouter.post('/deposit', auth, admin, recordDeposit)
treasuryRouter.post('/withdraw', auth, admin, recordWithdrawal)

export default treasuryRouter
