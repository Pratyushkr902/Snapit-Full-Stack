// ============================================================
// Product Seller Re-assignment Script
// ============================================================
// FILL IN before running:
//   1. PRODUCTS_COLLECTION      -> your actual products collection name
//   2. SELLER_FIELD             -> the field on a product that links to a seller
//                                   (e.g. "sellerId", "seller", "storeId")
//   3. PALI_MEGA_MART_ID        -> the _id of the Pali Mega Mart doc in `sellers`
//   4. CATEGORY_FIELD           -> field on product holding category/name
//                                   (e.g. "category" or "name")
//
// Run with: mongosh "<your_connection_string>" reassign_products.js
// ============================================================

const db = db.getSiblingDB("YOUR_DB_NAME"); // <-- set your DB name

const PRODUCTS_COLLECTION = "products"; // <-- confirm collection name
const SELLER_FIELD = "sellerId";        // <-- confirm field name

// --- Known seller IDs (from sellers collection) ---
const COLD_DRINK_SHOP   = ObjectId("6a1c7874f4ac35eed9b78c55");
const FRESH_FRUITS_SHOP = ObjectId("6a1c7874f4ac35eed9b78c53");
const SURAJ_VEGETABLES  = ObjectId("6a34406ddeb133d219c65cde");
const PHARMA_WELLNESS   = ObjectId("6a3c349b26649655db61632b");
const EGG_SHOP          = ObjectId("6a1c7874f4ac35eed9b78c54");

// --- MISSING: fill this in from the Pali Mega Mart seller doc ---
const PALI_MEGA_MART = ObjectId("REPLACE_WITH_PALI_MEGA_MART_SELLER_ID");

const coll = db.getCollection(PRODUCTS_COLLECTION);

// ------------------------------------------------------------
// 1. Cold drinks -> Cold Drink & Energy Drink Shop
//    EXCEPT Monster Energy & Diet Coke -> Pali Mega Mart
// ------------------------------------------------------------
coll.updateMany(
  {
    category: "drinks", // <-- confirm this matches your schema
    name: { $not: /monster energy|diet coke/i }
  },
  { $set: { [SELLER_FIELD]: COLD_DRINK_SHOP } }
);

coll.updateMany(
  { name: /monster energy|diet coke/i },
  { $set: { [SELLER_FIELD]: PALI_MEGA_MART } }
);

// ------------------------------------------------------------
// 2. Fruits -> Fresh Fruits Shop
// ------------------------------------------------------------
coll.updateMany(
  { category: "fruits" },
  { $set: { [SELLER_FIELD]: FRESH_FRUITS_SHOP } }
);

// ------------------------------------------------------------
// 3. Vegetables -> Suraj Vegetables
// ------------------------------------------------------------
coll.updateMany(
  { category: "vegetables" },
  { $set: { [SELLER_FIELD]: SURAJ_VEGETABLES } }
);

// ------------------------------------------------------------
// 4. Pharma -> PharmaWellness
// ------------------------------------------------------------
coll.updateMany(
  { category: "pharma" },
  { $set: { [SELLER_FIELD]: PHARMA_WELLNESS } }
);

// ------------------------------------------------------------
// 5. Eggs / chicken / meat / fish -> Egg Shop
// ------------------------------------------------------------
coll.updateMany(
  { category: { $in: ["eggs", "chicken", "meat", "fish"] } },
  { $set: { [SELLER_FIELD]: EGG_SHOP } }
);

// ------------------------------------------------------------
// 6. Everything else in "grocery" -> Pali Mega Mart
// ------------------------------------------------------------
coll.updateMany(
  { category: "grocery" },
  { $set: { [SELLER_FIELD]: PALI_MEGA_MART } }
);

print("Done. Review matchedCount/modifiedCount in each result above.");
