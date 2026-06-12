import mongoose from 'mongoose'

/**
 * Restaurant.model.js  — updated
 *
 * Changes from original:
 *  + offers[]     — discount strings shown in the offer banner strip
 *  + opensAt      — time string shown when restaurant is closed ("Opens at 10:00 AM")
 *  + fssaiLicense — optional compliance field
 */
const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    logo: { type: String, default: '' },

    cuisineTypes: [{ type: String }],
    menuCategories: [{ type: String }],  // must stay in sync with MenuItem.category values
    tags: [{ type: String }],            // 'bestseller' | 'trending' | 'must-try' | 'pure-veg' | 'new'

    // ── Status ─────────────────────────────────────────────────────────────
    isOpen: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isPureVeg: { type: Boolean, default: false },

    // ── Offers shown in the orange banner strip on the menu page ───────────
    // e.g. ["50% OFF up to ₹100", "Free delivery on orders above ₹199"]
    offers: [{ type: String }],

    // Shown when isOpen === false: "Opens at 10:00 AM"
    opensAt: { type: String, default: '10:00 AM' },

    // ── Ratings ────────────────────────────────────────────────────────────
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },

    // ── Delivery ───────────────────────────────────────────────────────────
    deliveryTimeMin: { type: Number, default: 20 },
    deliveryTimeMax: { type: Number, default: 40 },
    deliveryFee: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },

    // ── Location ───────────────────────────────────────────────────────────
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

    // ── Ownership ──────────────────────────────────────────────────────────
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fssaiLicense: { type: String, default: '' },
  },
  { timestamps: true }
)

const RestaurantModel = mongoose.model('Restaurant', restaurantSchema)
export default RestaurantModel
