/**
 * Snapit DB Seed Script - Node.js + Mongoose
 * Restaurant: Satish Chowmein Center, Paliganj
 *
 * Run with: node seedSatishChowmeinCenter.js
 * Requires a .env file in this folder with MONGODB_URI set.
 * Requires: npm install mongoose dotenv
 */

require("dotenv").config();
const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  cuisine: [String],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  name: { type: String, required: true },
  category: String,
  isVeg: Boolean,
  price: {
    full: { type: Number, required: true },
    half: { type: Number, default: null }
  },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
const MenuItem = mongoose.model("MenuItem", menuItemSchema);

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
  { name: "Laccha Paratha", category: "Bread", isVeg: true, price: { full: 20, half: null } }
];

async function seed() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not found. Make sure .env exists in this folder.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    let restaurant = await Restaurant.findOne({ name: "Satish Chowmein Center", city: "Paliganj" });

    if (restaurant) {
      console.log("Restaurant already exists, using existing _id:", restaurant._id);
    } else {
      restaurant = await Restaurant.create({
        name: "Satish Chowmein Center",
        city: "Paliganj",
        cuisine: ["Chinese", "Indo-Chinese", "Fast Food"],
        isActive: true
      });
      console.log("Restaurant created with _id:", restaurant._id);
    }

    const itemsToInsert = menuItemsData.map(item => ({
      ...item,
      restaurantId: restaurant._id
    }));

    const existingNames = (await MenuItem.find({ restaurantId: restaurant._id }).select("name")).map(i => i.name);
    const newItems = itemsToInsert.filter(item => !existingNames.includes(item.name));

    if (newItems.length === 0) {
      console.log("All menu items already exist for this restaurant. Nothing to insert.");
    } else {
      const result = await MenuItem.insertMany(newItems);
      console.log(result.length + " menu items inserted for restaurant " + restaurant._id);
    }

  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seed();
