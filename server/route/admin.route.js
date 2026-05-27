import express from 'express'
import { admin } from '../middleware/Admin.js'

const router = express.Router()

router.get('/fix-subcategory', admin, async (req, res) => {
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
})

export default router