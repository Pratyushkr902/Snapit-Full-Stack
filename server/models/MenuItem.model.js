import mongoose from 'mongoose'

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },

    // ── Identity ─────────────────────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },

    // Category string used to group items in the menu tab bar.
    // Must match one of Restaurant.menuCategories[]
    category: { type: String, required: true, trim: true, index: true },

    // ── Pricing ──────────────────────────────────────────────────────────────
    price: { type: Number, required: true },          // MRP shown to customer
    discountedPrice: { type: Number, default: 0 },   // actual customer pays (0 = no discount)
    snapitMargin: { type: Number, default: 0 },      // Snapit platform commission per sale

    // ── Food flags ───────────────────────────────────────────────────────────
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    isBestseller: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },

    // ── Extra info (optional, shown on item card) ────────────────────────────
    calories: { type: Number, default: 0 },
    prepTime: { type: Number, default: 0 },       // minutes
    sortOrder: { type: Number, default: 0 },      // display order within category

    // ── Customisation groups (toppings, size, add-ons) ───────────────────────
    customizations: [
      {
        groupName: { type: String },
        isRequired: { type: Boolean, default: false },
        minSelect: { type: Number, default: 0 },
        maxSelect: { type: Number, default: 1 },
        options: [
          {
            name: { type: String },
            extraPrice: { type: Number, default: 0 },
          },
        ],
      },
    ],
  },
  { timestamps: true }
)

menuItemSchema.index(
  { name: 'text', description: 'text' },
  { weights: { name: 10, description: 5 } }
)

menuItemSchema.index({ restaurantId: 1, category: 1, sortOrder: 1 })

const MenuItemModel = mongoose.model('MenuItem', menuItemSchema)
export default MenuItemModel