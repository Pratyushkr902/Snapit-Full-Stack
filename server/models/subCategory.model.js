import mongoose from 'mongoose'

/**
 * SubCategory.model.js
 *
 * Merged from your existing file + new schema.
 *
 * Key fix: your old file used `category: [{ type: ObjectId }]` (array).
 * The new version uses a single ObjectId with index: true.
 * KEPT as array to avoid breaking your existing Product.model.js populate calls
 * that already work — but added index and sortOrder from the new version.
 *
 * Registered as 'subCategory' (lowercase) to match:
 *   - Product.model.js  → ref: 'subCategory'
 *   - your route/controller imports
 */

const subCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true,
    },

    image: {
      type: String,
      default: '',
    },

    // Array kept from your original file so existing populate() calls
    // on Product.model.js continue to work without changes.
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
      },
    ],

    // Controls display order on the frontend pill strip (new addition)
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Index for fast lookups by parent category (new addition)
subCategorySchema.index({ category: 1, sortOrder: 1 })

// Registered as 'subCategory' — matches ref in Product.model.js
const SubCategoryModel = mongoose.model('subCategory', subCategorySchema)
export default SubCategoryModel