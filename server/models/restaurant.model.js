import mongoose from 'mongoose'

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },          // cover banner
    logo: { type: String, default: '' },
    cuisineTypes: [{ type: String }],              // ['Fast Food', 'Indian', 'Chinese']
    isOpen: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    deliveryTimeMin: { type: Number, default: 20 },  // minutes
    deliveryTimeMax: { type: Number, default: 40 },
    deliveryFee: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
    address: {
      street: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: 'Paliganj' },
      pincode: { type: String, default: '' },
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    menuCategories: [{ type: String }],  // ['Burgers', 'Pizza', 'Drinks']
    tags: [{ type: String }],            // ['bestseller', 'new', 'pure-veg']
    isPureVeg: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

const RestaurantModel = mongoose.model('Restaurant', restaurantSchema)
export default RestaurantModel