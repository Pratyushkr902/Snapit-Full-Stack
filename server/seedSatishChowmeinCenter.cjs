/**
 * seedSatishChowmeinCenter.js
 *
 * Properly sets up "Satish Chowmein Center" to match the real schema
 * used by your live app (Restaurant.model.js).
 *
 * This script does THREE things:
 *   1. Updates the Restaurant document with all fields your other
 *      restaurants have (image, offers, address.area, ratings, etc.)
 *   2. Inserts the menu items for this restaurant (skips duplicates by name)
 *   3. Updates the owner's User document (Satish Gupta) so he becomes a
 *      proper RESTAURANT_OWNER linked to this restaurant via restaurantId
 *
 * Run with: node seedSatishChowmeinCenter.js
 * Requires a .env file in this folder with MONGODB_URI set.
 * Requires: npm install mongoose dotenv
 */

require("dotenv").config();
const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────
// SCHEMAS — kept identical to your real Restaurant.model.js.
// If you already import these models elsewhere in your app, you can
// delete these definitions and `require` your real model files instead.
// ─────────────────────────────────────────────────────────────────────────

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    logo: { type: String, default: "" },

    cuisineTypes: [{ type: String }],
    menuCategories: [{ type: String }],
    tags: [{ type: String }],

    isOpen: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isPureVeg: { type: Boolean, default: false },

    offers: [{ type: String }],
    opensAt: { type: String, default: "10:00 AM" },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },

    deliveryTimeMin: { type: Number, default: 20 },
    deliveryTimeMax: { type: Number, default: 40 },
    deliveryFee: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },

    address: {
      street: { type: String, default: "" },
      area: { type: String, default: "" },
      city: { type: String, default: "Paliganj" },
      pincode: { type: String, default: "" },
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fssaiLicense: { type: String, default: "" },
  },
  { timestamps: true }
);

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true },
    category: String,
    isVeg: Boolean,
    price: {
      full: { type: Number, required: true },
      half: { type: Number, default: null },
    },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// NOTE: only the fields this script needs to touch are declared here.
// `strict: false` lets this partial schema update a User doc that has
// many more fields than this, without wiping or breaking the rest.
const userSchema = new mongoose.Schema(
  {
    role: { type: String },
    store_name: { type: String },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
  },
  { strict: false, timestamps: true }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
const MenuItem = mongoose.model("MenuItem", menuItemSchema);
const User = mongoose.model("User", userSchema);

// ─────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────

const RESTAURANT_ID = "6a34203c995b866a201bd7a1"; // existing Satish Chowmein Center _id
const OWNER_USER_ID = "6a340c55a088fc695fe6ad23"; // Satish Gupta's User _id

const restaurantUpdate = {
  name: "Satish Chowmein Center",
  description: "Quick bites — chowmein, momos & rolls in Paliganj",
  image:
    "https://images.unsplash.com/photo-1607328874071-45a9cd600644?w=800&auto=format&fit=crop",
  logo: "",

  cuisineTypes: ["Chinese", "Indo-Chinese", "Fast Food"],
  menuCategories: ["Chowmin", "Manchurian", "Paneer", "Rolls", "Chicken", "Bread"],
  tags: [],

  isOpen: true,
  isActive: true,
  isPureVeg: false,

  offers: [], // e.g. "50% OFF up to ₹100" — add real offers later
  opensAt: "10:00 AM",

  rating: 0,
  totalRatings: 0,

  deliveryTimeMin: 20,
  deliveryTimeMax: 30,
  deliveryFee: 12,
  minOrderValue: 99,

  address: {
    street: "",
    area: "Paliganj",
    city: "Paliganj",
    pincode: "",
  },
  location: {}, // add lat/lng later if you have GPS coordinates

  ownerId: OWNER_USER_ID,
  fssaiLicense: "",
};

const menuItemsData = [
  { name: "Chowmin", category: "Chowmin", isVeg: true, price: { full: 60, half: 30 } },
  { name: "Chowmin Fry Manchurian", category: "Chowmin", isVeg: true, price: { full: 100, half: 60 } },
  { name: "Mix Chowmin", category: "Chowmin", isVeg: true, price: { full: 160, half: 80 } },
  { name: "Fry Chowmin", category: "Chowmin", isVeg: true, price: { full: 80, half: 50 } },
  { name: "Paneer Chowmin", category: "Chowmin", isVeg: true, price: { full: 130, half: 80 } },
  { name: "Egg Chowmin", category: "Chowmin", isVeg: false, price: { full: 100, half: 50 } },
  { name: "Chicken Chowmin", category: "Chowmin", isVeg: false, price: { full: 140, half: 80 } },
  { name: "Manchurian", category: "Manchurian", isVeg: true, price: { full: 80, half: 40 } },
  { name: "Fry Manchurian", category: "Manchurian", isVeg: true, price: { full: 130, half: 50 } },
  { name: "Paneer Chilli", category: "Paneer", isVeg: true, price: { full: 160, half: 80 } },
  { name: "Paneer Roll", category: "Rolls", isVeg: true, price: { full: 50, half: null } },
  { name: "Egg Roll (2 Anda)", category: "Rolls", isVeg: false, price: { full: 40, half: null } },
  { name: "Chicken Chilli", category: "Chicken", isVeg: false, price: { full: 80, half: 40 } },
  { name: "Chicken Bone Fry", category: "Chicken", isVeg: false, price: { full: 120, half: 70 } },
  { name: "Chicken Boneless", category: "Chicken", isVeg: false, price: { full: 140, half: 80 } },
  { name: "Laccha Paratha", category: "Bread", isVeg: true, price: { full: 20, half: null } },
];

// ─────────────────────────────────────────────────────────────────────────
// SCRIPT
// ─────────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not found. Make sure .env exists in this folder.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // 1. Update the Restaurant document with full schema fields
    const restaurant = await Restaurant.findByIdAndUpdate(
      RESTAURANT_ID,
      { $set: restaurantUpdate },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      throw new Error(`No restaurant found with _id ${RESTAURANT_ID}`);
    }
    console.log("✅ Restaurant updated:", restaurant.name, restaurant._id);

    // 2. Insert menu items (skip ones that already exist by name, for this restaurant)
    const existingNames = (
      await MenuItem.find({ restaurantId: restaurant._id }).select("name")
    ).map((i) => i.name);

    const newItems = menuItemsData
      .filter((item) => !existingNames.includes(item.name))
      .map((item) => ({ ...item, restaurantId: restaurant._id }));

    if (newItems.length === 0) {
      console.log("All menu items already exist. Nothing to insert.");
    } else {
      const result = await MenuItem.insertMany(newItems);
      console.log(`✅ ${result.length} menu items inserted.`);
    }

    // 3. Update the owner's User doc → role + store_name + restaurantId
    //    (role value confirmed from existing owner doc: "RESTO_SELLER")
    const user = await User.findByIdAndUpdate(
      OWNER_USER_ID,
      {
        $set: {
          role: "RESTO_SELLER",
          store_name: restaurant.name,
          restaurantId: restaurant._id,
        },
      },
      { new: true }
    );

    if (!user) {
      console.log("⚠️  No user found with that _id — owner role/restaurantId NOT updated.");
    } else {
      console.log(`✅ User "${user.name}" updated → role: RESTO_SELLER, store_name: ${user.store_name}, restaurantId: ${restaurant._id}`);
    }

    console.log("\n🎉 Done. Satish Chowmein Center is fully set up.");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seed();