/**
 * bulkImportProducts.cjs
 *
 * Bulk-import products into MongoDB Atlas for Snapit, with full support for:
 *   - variantGroup / variantType / variantLabel / variantColor
 *   - store_inventory (Pali Mega Mart by default, sellerId auto-resolved)
 *   - safe re-runs (upsert by name + variantLabel + store, no duplicates)
 *
 * USAGE:
 *   1. Fill in products-data.json with your ~90 items (see template below).
 *   2. Set MONGODB_URI in server/.env (already exists in your project).
 *   3. Run:
 *        node bulkImportProducts.cjs
 *      or point to a custom data file:
 *        node bulkImportProducts.cjs ./my-other-products.json
 */

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "server", ".env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found. Set it in server/.env or export it before running.");
  process.exit(1);
}

// ---- CONFIG ----
const DEFAULT_STORE_NAME = "Pali Mega Mart";
const DEFAULT_STORE_COORDS = { lat: 25.3309509, lng: 84.8006092 };
const DATA_FILE = process.argv[2] || path.join(__dirname, "products-data.json");

// ---- MINIMAL SCHEMA (mirrors server/models/product.model.js relevant fields) ----
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    unit: { type: String, default: "" },
    category: { type: String, default: "" },
    image: { type: String, default: "" },

    variantGroup: { type: String, default: "", trim: true, index: true },
    variantType: { type: String, default: "size", trim: true },
    variantLabel: { type: String, default: "", trim: true },
    variantColor: { type: String, default: "", trim: true },

    store_inventory: [
      {
        store_name: { type: String, required: true },
        sellerId: { type: mongoose.Schema.ObjectId, ref: "User", default: null },
        stock: { type: Number, default: 0 },
        price: { type: Number },
      },
    ],
  },
  { strict: false, timestamps: true }
);

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model("User", userSchema);

async function resolveSellerId(storeName) {
  const seller = await User.findOne({
    role: "SELLER",
    $or: [{ storeName: storeName }, { store_name: storeName }],
  }).lean();

  if (!seller) {
    console.warn(`⚠️  No SELLER user found for store "${storeName}". sellerId will be null.`);
    return null;
  }
  return seller._id;
}

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Data file not found: ${DATA_FILE}`);
    console.error(`   Create it (see products-data.template.json) and re-run.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  let items;
  try {
    items = JSON.parse(raw);
  } catch (e) {
    console.error("❌ Invalid JSON in data file:", e.message);
    process.exit(1);
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.error("❌ Data file must be a non-empty JSON array.");
    process.exit(1);
  }

  console.log(`🔌 Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);
  console.log(`✅ Connected.`);

  const sellerCache = {};
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const [idx, item] of items.entries()) {
    try {
      const storeName = item.store_name || DEFAULT_STORE_NAME;

      if (!(storeName in sellerCache)) {
        sellerCache[storeName] = await resolveSellerId(storeName);
      }
      const sellerId = sellerCache[storeName];

      const variantGroup = item.variantGroup || "";
      const variantType = item.variantType || "size";
      const variantLabel = item.variantLabel || "";
      const variantColor = item.variantColor || "";

      const update = {
        $set: {
          name: item.name,
          price: item.price,
          unit: item.unit || "",
          category: item.category || "",
          image: item.image || "",
          variantGroup,
          variantType,
          variantLabel,
          variantColor,
        },
      };

      const existing = await Product.findOne({
        name: item.name,
        variantLabel: variantLabel,
      });

      if (existing) {
        const invIdx = existing.store_inventory.findIndex(
          (s) => s.store_name === storeName
        );

        if (invIdx >= 0) {
          existing.store_inventory[invIdx].stock = item.stock ?? 0;
          existing.store_inventory[invIdx].price = item.price;
          existing.store_inventory[invIdx].sellerId = sellerId;
        } else {
          existing.store_inventory.push({
            store_name: storeName,
            sellerId,
            stock: item.stock ?? 0,
            price: item.price,
          });
        }

        existing.set(update.$set);
        await existing.save();
        updated++;
        console.log(`↻  Updated: ${item.name}${variantLabel ? " (" + variantLabel + ")" : ""}`);
      } else {
        await Product.create({
          ...update.$set,
          store_inventory: [
            {
              store_name: storeName,
              sellerId,
              stock: item.stock ?? 0,
              price: item.price,
            },
          ],
        });
        created++;
        console.log(`＋ Created: ${item.name}${variantLabel ? " (" + variantLabel + ")" : ""}`);
      }
    } catch (err) {
      failed++;
      console.error(`❌ Failed on item #${idx} (${item.name || "unnamed"}):`, err.message);
    }
  }

  console.log("\n──── Import Summary ────");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Total processed: ${items.length}`);

  await mongoose.disconnect();
  console.log("🔌 Disconnected. Done.");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
