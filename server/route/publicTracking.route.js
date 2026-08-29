import { Router } from 'express'
import { getPublicTrackingController } from '../controllers/publicTracking.controller.js'

const publicTrackingRouter = Router()

publicTrackingRouter.get('/:token', getPublicTrackingController)

export default publicTrackingRouter
