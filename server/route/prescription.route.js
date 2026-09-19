import { Router } from 'express'
import auth from '../middleware/auth.js'
import optionalAuth from '../middleware/optionalAuth.js'
import admin from '../middleware/admin.js'
import {
  uploadPrescriptionController,
  getMyPrescriptionsController,
  getAllPrescriptionsAdminController,
  updatePrescriptionStatusController,
} from '../controllers/prescription.controller.js'

const prescriptionRouter = Router()

prescriptionRouter.post('/upload', optionalAuth, uploadPrescriptionController)
prescriptionRouter.get('/my-prescriptions', auth, getMyPrescriptionsController)
prescriptionRouter.get('/admin/all', auth, admin, getAllPrescriptionsAdminController)
prescriptionRouter.put('/admin/update-status', auth, admin, updatePrescriptionStatusController)

export default prescriptionRouter

