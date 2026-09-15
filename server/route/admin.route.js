import express from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import SubCategoryModel from '../models/subCategory.model.js'
import CategoryModel from '../models/category.model.js'
import SystemConfigModel from '../models/systemConfig.model.js'
import UserModel from '../models/user.model.js'
import { getCachedStoreConfig, setCachedStoreConfig, initStoreStatus } from '../utils/storeStatus.js'

const router = express.Router()

// GET /api/admin/store-status (Public/Customer checkable)
router.get('/store-status', async (req, res) => {
    try {
        const config = getCachedStoreConfig()
        return res.json({
            success: true,
            data: config
        })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
})

// POST /api/admin/toggle-store-status (Super Admin / Admin 1-click toggle)
router.post('/toggle-store-status', auth, admin, async (req, res) => {
    try {
        const { isClosedForToday, closedReason, reopenTime } = req.body
        const userId = req.userId
        const user = await UserModel.findById(userId).select('name role')

        const updatedConfig = {
            isClosedForToday: Boolean(isClosedForToday),
            closedReason: closedReason || (isClosedForToday
                ? 'Snapit is closed for today. Deliveries will resume tomorrow at 8:30 AM IST!'
                : ''),
            reopenTime: reopenTime || '8:30 AM Tomorrow',
            updatedAt: new Date(),
            updatedByName: user?.name || 'Super Admin'
        }

        await SystemConfigModel.findOneAndUpdate(
            { key: 'store_closure_status' },
            {
                value: updatedConfig,
                updatedBy: userId,
                updatedByName: user?.name || 'Super Admin'
            },
            { upsert: true, new: true }
        )

        setCachedStoreConfig(updatedConfig)

        // Broadcast real-time change to all connected app clients via socket
        const io = req.app.get('io')
        if (io) {
            io.emit('store_status_changed', updatedConfig)
        }

        return res.json({
            success: true,
            message: updatedConfig.isClosedForToday
                ? 'Store marked as CLOSED for today ⛔'
                : 'Store is now OPEN for orders 🟢',
            data: updatedConfig
        })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
})

router.get(
    '/fix-subcategory',
    auth,
    admin,
    async (req, res) => {
        try {
            // 1. Fetch all existing subcategories from the database
            const subCategories = await SubCategoryModel.find({});
            let updateCount = 0;

            for (const subCat of subCategories) {
                // Check if the subcategory contains a valid parent category link array
                if (subCat.category && subCat.category.length > 0) {
                    for (const catId of subCat.category) {
                        // Push the subcategory reference ID into the parent category's subCategory array ($addToSet avoids duplicates)
                        await CategoryModel.findByIdAndUpdate(
                            catId,
                            { $addToSet: { subCategory: subCat._id } }
                        );
                    }
                    updateCount++;
                }
            }

            // ✅ FIXED: Returns a comprehensive metrics summary instead of a static placeholder text
            return res.json({
                success: true,
                message: `Structural migration completed successfully. Linked ${updateCount} subcategories back to their parent category documents.`,
                processedCount: updateCount
            })

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "Internal database script execution breakdown."
            })
        }
    }
)

export default router