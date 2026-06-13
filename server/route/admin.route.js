import express from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import SubCategoryModel from '../models/SubCategory.model.js' // ✅ Ensure these point to your exact schema paths
import CategoryModel from '../models/category.model.js'       // ✅ Ensure these point to your exact schema paths

const router = express.Router()

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