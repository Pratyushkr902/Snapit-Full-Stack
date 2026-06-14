import { Router } from 'express'
import auth from '../middleware/auth.js'
import {
    addAddressController,
    deleteAddresscontroller,
    getAddressController,
    updateAddressController,
    validateCreateAddress,
    validateUpdateAddress,
} from '../controllers/address.controller.js'

const addressRouter = Router()

// SECURITY FIX: Validation middleware added to all mutating routes.
// express-validator rules are defined in the controller file and wired in here.
addressRouter.post('/create',  auth, validateCreateAddress, addAddressController)
addressRouter.get( "/get",     auth,                        getAddressController)
addressRouter.put( '/update',  auth, validateUpdateAddress,  updateAddressController)
addressRouter.delete("/disable", auth,                       deleteAddresscontroller)

export default addressRouter