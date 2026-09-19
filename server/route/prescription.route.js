import { Router } from 'express'
import auth from '../middleware/auth.js'
import admin from '../middleware/admin.js'
import {
  uploadPrescriptionController,
  getMyPrescriptionsController,
  getAllPrescriptionsAdminController,
  updatePrescriptionStatusController,
} from '../controllers/prescription.controller.js'

const prescriptionRouter = Router()

prescriptionRouter.post('/upload', auth, uploadPrescriptionController)
prescriptionRouter.get('/my-prescriptions', auth, getMyPrescriptionsController)
prescriptionRouter.get('/admin/all', auth, admin, getAllPrescriptionsAdminController)
prescriptionRouter.put('/admin/update-status', auth, admin, updatePrescriptionStatusController)

export default prescriptionRouter

