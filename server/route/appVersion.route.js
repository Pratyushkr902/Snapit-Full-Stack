import { Router } from 'express'
import { getAppVersionController, updateAppVersionConfigController } from '../controllers/appVersion.controller.js'
import auth from '../middleware/auth.js'
import admin from '../middleware/Admin.js'

const appVersionRouter = Router()

appVersionRouter.get('/', getAppVersionController)
appVersionRouter.post('/config', auth, admin, updateAppVersionConfigController)

export default appVersionRouter

