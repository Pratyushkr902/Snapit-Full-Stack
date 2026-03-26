import mongoose from "mongoose";

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String },
    // GeoJSON Point for location
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// CRITICAL: Index for proximity searching
storeSchema.index({ location: "2dsphere" });

// NEW: Validation Middleware
// This prevents the server from crashing if coordinates are swapped or invalid
storeSchema.pre('save', function(next) {
    const coords = this.location.coordinates;
    if (coords[0] < -180 || coords[0] > 180) {
        return next(new Error("Invalid Longitude: Must be between -180 and 180"));
    }
    if (coords[1] < -90 || coords[1] > 90) {
        return next(new Error("Invalid Latitude: Must be between -90 and 90"));
    }
    next();
});

const StoreModel = mongoose.model('store', storeSchema);
export default StoreModel;