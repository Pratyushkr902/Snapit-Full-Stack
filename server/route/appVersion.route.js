import { Router } from 'express'
import { getAppVersionController } from '../controllers/appVersion.controller.js'

const appVersionRouter = Router()

appVersionRouter.get('/', getAppVersionController)

export default appVersionRouter
