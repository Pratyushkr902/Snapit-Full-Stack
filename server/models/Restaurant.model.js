import mongoose from 'mongoose'

/**
 * Restaurant.model.js  — merged
 *
 * Added from new version (missing in your original):
 *  + offers[]      — discount strings shown in the orange offer banner strip
 *                    e.g. ["50% OFF up to ₹100", "Free delivery on orders above ₹199"]
 *  + opensAt       — shown when isOpen === false: "Opens at 10:00 AM"
 *  + fssaiLicense  — optional compliance field
 *  + logo          — already in new version, added here
 *
 * Everything else kept identical to your original.
 */

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },   // cover banner
    logo: { type: String, default: '' },

    cuisineTypes: [{ type: String }],       // ['Fast Food', 'Indian', 'Chinese']
    menuCategories: [{ type: String }],     // must stay in sync with MenuItem.category values
    tags: [{ type: String }],              // 'bestseller' | 'trending' | 'pure-veg' | 'new'

    // ── Status ──────────────────────────────────────────────────────────────
    isOpen: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isPureVeg: { type: Boolean, default: false },

    // ── Offers shown in the orange banner strip on the menu page ────────────
    // e.g. ["50% OFF up to ₹100", "Free delivery on orders above ₹199"]
    offers: [{ type: String }],

    // Shown when isOpen === false  →  "Opens at 10:00 AM"
    opensAt: { type: String, default: '10:00 AM' },

    // ── Ratings ─────────────────────────────────────────────────────────────
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },

    // ── Delivery ────────────────────────────────────────────────────────────
    deliveryTimeMin: { type: Number, default: 20 },
    deliveryTimeMax: { type: Number, default: 40 },
    deliveryFee: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },

    // ── Location ────────────────────────────────────────────────────────────
    address: {
      street:  { type: String, default: '' },
      area:    { type: String, default: '' },
      city:    { type: String, default: 'Paliganj' },
      pincode: { type: String, default: '' },
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // ── Ownership ────────────────────────────────────────────────────────────
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fssaiLicense: { type: String, default: '' },
  },
  { timestamps: true }
)

const RestaurantModel = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema)
export default RestaurantModel
