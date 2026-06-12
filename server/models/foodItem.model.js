import mongoose from 'mongoose'

const foodItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    price: { type: Number, required: true },
    discountedPrice: { type: Number, default: 0 },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    menuCategory: { type: String, required: true },  // 'Burgers', 'Drinks' etc.
    isVeg: { type: Boolean, default: true },
    isBestseller: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    customizations: [
      {
        title: String,          // e.g. "Choose size"
        options: [
          {
            label: String,      // e.g. "Large"
            extraPrice: Number, // 0 if no extra charge
          },
        ],
      },
    ],
    preparationTime: { type: Number, default: 10 }, // minutes
    calories: { type: Number },
    allergens: [{ type: String }],
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const FoodItemModel = mongoose.model('FoodItem', foodItemSchema)
export default FoodItemModel