import mongoose from 'mongoose'

/**
 * SubCategory.model.js
 * Referenced as 'subCategory' in Product.model.js but never defined.
 * Each sub-category belongs to one parent Category.
 *
 * Example:
 *   Category: "Pharma & Wellness"
 *   SubCategories: "Vitamins", "Pain Relief", "Protein & Fitness", "Baby Care"
 *
 *   Category: "Grocery"
 *   SubCategories: "Atta & Rice", "Snacks", "Dairy", "Beverages"
 */
const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },

    // Parent category — matches the ref used in Product.model.js
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'category',
      required: true,
      index: true,
    },

    // Controls display order on the frontend pill strip
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const SubCategoryModel = mongoose.model('subCategory', subCategorySchema)
export default SubCategoryModel
