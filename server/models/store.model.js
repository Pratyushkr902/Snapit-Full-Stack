import mongoose from "mongoose";

const storeSchema = new mongoose.Schema({
    name:    { type: String, required: true },
    address: { type: String, required: true },
    phone:   { type: String, default: "" },
    category: {
        type:    String,
        enum:    ['grocery', 'bakery', 'fruits', 'eggs', 'drinks', 'general'],
        default: 'general'
    },
    location: {
        type: {
            type:    String,
            enum:    ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type:     [Number], // [longitude, latitude]
            required: true
        }
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Required for $near queries
storeSchema.index({ location: "2dsphere" });

// Prevent crashes from swapped or invalid coordinates
storeSchema.pre('save', async function () {
    const [lng, lat] = this.location.coordinates;
    if (lng < -180 || lng > 180) throw new Error("Invalid longitude: must be between -180 and 180");
    if (lat < -90  || lat > 90)  throw new Error("Invalid latitude: must be between -90 and 90");
});

const StoreModel = mongoose.model('store', storeSchema);
export default StoreModel;


/*
 * ─────────────────────────────────────────────
 *  SEED DATA — 5 stores in Paliganj
 *  Run once:  node scripts/seedStores.js
 * ─────────────────────────────────────────────
 *
 * [
 *   {
 *     name:     "Pali Mega Mart",
 *     address:  "Paliganj, Bihar",
 *     category: "grocery",
 *     location: { type: "Point", coordinates: [84.80167031847012, 25.329159207821725] }
 *   },
 *   {
 *     name:     "Monginis",
 *     address:  "Paliganj, Bihar",
 *     category: "bakery",
 *     location: { type: "Point", coordinates: [84.80167031847012, 25.329159207821725] }
 *   },
 *   {
 *     name:     "Fresh Fruits Shop",
 *     address:  "Paliganj, Bihar",
 *     category: "fruits",
 *     location: { type: "Point", coordinates: [84.801555, 25.329462] }
 *   },
 *   {
 *     name:     "Egg Shop",
 *     address:  "Paliganj, Bihar",
 *     category: "eggs",
 *     location: { type: "Point", coordinates: [84.800339, 25.330740] }
 *   },
 *   {
 *     name:     "Cold Drink & Energy Drink Shop",
 *     address:  "Paliganj, Bihar",
 *     category: "drinks",
 *     location: { type: "Point", coordinates: [84.803775, 25.333580] }
 *   }
 * ]
 */