import { Router } from 'express'
import optionalAuth from '../middleware/optionalAuth.js'
import uploadImageController from '../controllers/uploadImage.controller.js'
import uploadImageR2Controller from '../controllers/uploadImageR2Controller.js'
import upload from '../middleware/multer.js'

const uploadRouter = Router()

uploadRouter.post("/upload",    optionalAuth, upload.single("image"), uploadImageController)
uploadRouter.post("/upload-r2", optionalAuth, upload.single("image"), uploadImageR2Controller)

export default uploadRouter
