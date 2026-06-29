import { Router } from 'express'
import auth from '../middleware/auth.js'
import uploadImageController from '../controllers/uploadImage.controller.js'
import uploadImageR2Controller from '../controllers/uploadImageR2Controller.js'
import upload from '../middleware/multer.js'

const uploadRouter = Router()

uploadRouter.post("/upload",    auth, upload.single("image"), uploadImageController)
uploadRouter.post("/upload-r2", auth, upload.single("image"), uploadImageR2Controller)

export default uploadRouter
