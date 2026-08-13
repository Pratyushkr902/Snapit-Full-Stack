import express from 'express'
import auth from '../middleware/auth.js'
import { superAdmin } from '../middleware/Admin.js'
import {
    createAdminController,
    listAdminsController,
    updateAdminStatusController,
    removeAdminController,
    listFrozenIPsController,
    unfreezeIPController
} from '../controllers/adminManagement.controller.js'

const router = express.Router()

router.post('/create', auth, superAdmin, createAdminController)
router.get('/list', auth, superAdmin, listAdminsController)
router.patch('/:adminId/status', auth, superAdmin, updateAdminStatusController)
router.delete('/:adminId', auth, superAdmin, removeAdminController)

router.get('/frozen-ips', auth, superAdmin, listFrozenIPsController)
router.delete('/frozen-ips/:ip', auth, superAdmin, unfreezeIPController)

export default router
