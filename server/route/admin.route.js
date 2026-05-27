import express from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'

const router = express.Router()

router.get(
    '/fix-subcategory',
    auth,
    admin,
    async (req, res) => {
        try {
            return res.json({
                success: true,
                message: 'Admin route working'
            })
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            })
        }
    }
)

export default router
