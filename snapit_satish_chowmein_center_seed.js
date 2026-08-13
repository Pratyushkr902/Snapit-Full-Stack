/**
 * Snapit DB Seed Script - MongoDB
 * Restaurant: Satish Chowmein Center, Paliganj
 *
 * Run with mongosh (database name "snapit" is already in the URI path):
 *   mongosh "mongodb+srv://<user>:<password>@snapit.na1dsaj.mongodb.net/snapit?retryWrites=true&w=majority&appName=Snapit" snapit_satish_chowmein_center_seed.js
 *
 * IMPORTANT: don't hardcode credentials into this file or commit them anywhere.
 * Pass the URI on the command line (as above) or via an environment variable instead.
 *
 * Assumes two collections: "restaurants" and "menuItems"
 * (menuItems reference the restaurant via restaurantId)
 */

// db is already set to "snapit" because the URI includes /snapit

// 1. Create the restaurant
const restaurant = {
  name: "Satish Chowmein Center",
  city: "Paliganj",
  cuisine: ["Chinese", "Indo-Chinese", "Fast Food"],
  isActive: true,
  createdAt: new Date()
};

const restaurantResult = db.restaurants.insertOne(restaurant);
const restaurantId = restaurantResult.insertedId;

print("Restaurant created with _id: " + restaurantId);

// 2. Menu items
// price.half = null means half plate not available for that item
const menuItems = [
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
].map(item => ({
  ...item,
  restaurantId: restaurantId,
  isAvailable: true,
  createdAt: new Date()
}));

const menuResult = db.menuItems.insertMany(menuItems);
print(menuResult.insertedCount + " menu items inserted for restaurant " + restaurantId);