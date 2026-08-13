/**
 * seedPaliMegaMart.js
 * -----------------------------------------------------------------------
 * Adds Pali Mega Mart's product list to the Snapit `product` collection.
 *
 * HOW TO RUN
 *   1. Copy this file into your `server/` folder (same level as index.js)
 *   2. Make sure server/.env has MONGODB_URI set (same as your app uses)
 *   3. From server/:  node seedPaliMegaMart.js
 *
 * WHAT IT DOES
 *   - Connects using the same MONGODB_URI your app already uses
 *   - Uses HARDCODED categoryId per product (no keyword guessing anymore)
 *   - Sets sellerPrice (from the list), snapitMargin: 0 -> pre-save hook
 *     computes sellingPrice/price automatically (per your schema)
 *   - Adds a store_inventory entry for Pali Mega Mart / this sellerId
 *   - Leaves `image: []` for you to fill in manually later
 *   - Links Dhara Mustard Oil 1L / 500ml as true size variants
 *
 * SAFE TO RE-RUN: it upserts by (name + unit) so running twice won't
 * create duplicates.
 * -----------------------------------------------------------------------
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import ProductModel from "./models/product.model.js"; // adjust path if different

dotenv.config();

const SELLER_ID = "6a2eb7fd4e5b4077a6af828d"; // Kunal Kumar / Pali Mega Mart
const STORE_NAME = "Pali Mega Mart";
const DEFAULT_STOCK = 50; // <-- change this if you want a different default

// ---------------------------------------------------------------------
// REAL CATEGORY IDs pulled from your DB via scripts/listCategories.js
// ---------------------------------------------------------------------
const CAT = {
  ATTA_RICE_DAL: "69b56fada8b9adccd30c619e",
  MASALA_OIL: "69b57052a8b9adccd30c61a1",
  BABY_CARE: "69b57091a8b9adccd30c61a4",
  BAKERY_BISCUITS: "69b570b2a8b9adccd30c61a7",
  BREAKFAST_INSTANT: "69b570d9a8b9adccd30c61aa",
  CHICKEN_MEAT_FISH: "69b57104a8b9adccd30c61ad",
  COLD_DRINKS_JUICES: "69b57143a8b9adccd30c61b0",
  DAIRY_BREAD_EGGS: "69b57164a8b9adccd30c61b3",
  FRUITS_VEGETABLES: "69b5717fa8b9adccd30c61b6",
  HOME_OFFICE: "69b571a0a8b9adccd30c61b9",
  ORGANIC_HEALTHY: "69b571c1a8b9adccd30c61bc",
  PAAN_CORNER: "69b571dda8b9adccd30c61bf",
  PERSONAL_CARE: "69b571f9a8b9adccd30c61c2",
  PHARMA_WELLNESS: "69b57215a8b9adccd30c61c5",
  SAUCES_SPREADS: "69b57231a8b9adccd30c61c8",
  SNACKS_MUNCHIES: "69b57255a8b9adccd30c61cb",
  TEA_COFFEE_HEALTH: "69b57278a8b9adccd30c61ce",
  CLEANING: "69b572dea8b9adccd30c61d3",
  SWEET_TOOTH: "69b5733fa8b9adccd30c61d6",
  PET_CARE: "69b573a9a8b9adccd30c61d9",
};

// ---------------------------------------------------------------------
// 1. RAW PRODUCT LIST
// ---------------------------------------------------------------------
// price: null means "no price given, needs manual fix" -> saved unpublished
const RAW_PRODUCTS = [
  // ---- PERSONAL CARE (bath/oral/hair/skin) ----------------------------
  { name: "Detail Original Liquid Hand Wash (Buy 1 Get 1 Free)", unit: "180ml + 180ml", price: 95, categoryId: CAT.PERSONAL_CARE },
  { name: "Colgate Glow In Dark", unit: "80gm", price: 185, categoryId: CAT.PERSONAL_CARE },
  { name: "Colgate Charcoal Clean Gel", unit: "120gm", price: 200, categoryId: CAT.PERSONAL_CARE },
  { name: "Colgate Charcoal Deep Clean (with premium toothbrush)", unit: "150gm", price: 255, categoryId: CAT.PERSONAL_CARE },
  { name: "Sensodyne Fresh Gel", unit: "150gm", price: 250, categoryId: CAT.PERSONAL_CARE },
  { name: "Gillette Venus", unit: "1 unit", price: 325, categoryId: CAT.PERSONAL_CARE },
  { name: "Gillette Guard", unit: "125gm", price: 65, categoryId: CAT.PERSONAL_CARE },
  { name: "Bajaj Almond Drops Hair Oil", unit: "190ml + 10ml", price: 170, categoryId: CAT.PERSONAL_CARE },
  { name: "Bajaj Almond Drops Hair Oil", unit: "45ml + 4.5ml", price: 40, categoryId: CAT.PERSONAL_CARE },
  { name: "Himani Gange Hair Oil", unit: "200ml", price: 55, categoryId: CAT.PERSONAL_CARE },
  { name: "Navratna Hair Oil", unit: "90ml", price: 90, categoryId: CAT.PERSONAL_CARE },
  { name: "Parachute Coconut Hair Oil", unit: "175ml", price: 130, categoryId: CAT.PERSONAL_CARE },
  { name: "Nihar Naturals Advanced Coconut Hair Oil", unit: "160ml", price: 80, categoryId: CAT.PERSONAL_CARE },
  { name: "Hair & Care Hair Oil", unit: "200ml", price: 120, categoryId: CAT.PERSONAL_CARE },
  { name: "Dabur Sarso Tel", unit: "170ml", price: 55, categoryId: CAT.PERSONAL_CARE },
  { name: "Dabur Amla Hair Oil (50% Extra)", unit: "90ml + 46ml", price: 50, categoryId: CAT.PERSONAL_CARE },
  { name: "Dabur Almond Hair Oil (Soya Protein, Free Pack)", unit: "95ml", price: 72, categoryId: CAT.PERSONAL_CARE },
  { name: "Nature Essence Face Cream Papaya", unit: "60gm", price: 125, categoryId: CAT.PERSONAL_CARE },
  { name: "Veet Pure Hair Removal Cream", unit: "30gm", price: 115, categoryId: CAT.PERSONAL_CARE },
  { name: "Godrej Sandal Turmeric Soap (4+1 Free)", unit: "500gm", price: 120, categoryId: CAT.PERSONAL_CARE },
  { name: "Margo Original Soap (4+1 Free)", unit: "500gm", price: 160, categoryId: CAT.PERSONAL_CARE },
  { name: "Margo Soap (Buy 3 Get 1 Free)", unit: "300gm", price: 93, categoryId: CAT.PERSONAL_CARE },
  { name: "Simple Refreshing Face Gel", unit: "50ml", price: 149, categoryId: CAT.PERSONAL_CARE },
  { name: "Himalaya Purifying Neem Face Scrub", unit: "50gm", price: 95, categoryId: CAT.PERSONAL_CARE },
  { name: "Himalaya Purifying Neem Face Wash", unit: "200ml", price: 449, categoryId: CAT.PERSONAL_CARE },
  { name: "Lake Blush & Glow Avocado Matcha Jelly Face Wash", unit: "50gm", price: 135, categoryId: CAT.PERSONAL_CARE },
  { name: "Lake Blueberry + Peptide Jelly Face Wash", unit: "50gm", price: 135, categoryId: CAT.PERSONAL_CARE },
  { name: "Pond's Sun Miracle Protect & Bright", unit: "50gm", price: 325, categoryId: CAT.PERSONAL_CARE },
  { name: "Glow & Lovely Bright Glow Face Wash", unit: "50gm", price: 89, categoryId: CAT.PERSONAL_CARE },
  { name: "Pond's Bright Miracle Detox Face Wash", unit: "50gm", price: 130, categoryId: CAT.PERSONAL_CARE },
  { name: "Himalaya Natural Glow Kesar Face Gel", unit: "100ml", price: 90, categoryId: CAT.PERSONAL_CARE },
  { name: "Himalaya Purifying Neem Face Gel", unit: "100ml", price: 90, categoryId: CAT.PERSONAL_CARE },
  { name: "Nivea Creme", unit: "100ml (95gm)", price: 275, categoryId: CAT.PERSONAL_CARE },
  { name: "Nivea Soft Light Moisturising Cream", unit: "100ml (98.3g)", price: 265, categoryId: CAT.PERSONAL_CARE },
  { name: "Nivea Men Dark Spot Reduction Creme", unit: "75ml (75.2g)", price: null, categoryId: CAT.PERSONAL_CARE }, // NO PRICE GIVEN
  { name: "Pond's Hydra Miracle N Super Light Gel", unit: "50ml", price: 178, categoryId: CAT.PERSONAL_CARE },
  { name: "Johnson's Baby Soap", unit: "50g", price: 50, categoryId: CAT.BABY_CARE },

  // ---- PHARMA / WELLNESS ------------------------------------------------
  { name: "Dettol Antiseptic Liquid", unit: "125ml", price: 84, categoryId: CAT.PHARMA_WELLNESS },

  // ---- CLEANING ----------------------------------------------------------
  { name: "Exo Anti-Bacterial Dishwash Bar (Free Scrubber)", unit: "500gm", price: 52, categoryId: CAT.CLEANING },
  { name: "Sparkle Lime & Orange Dishwasher", unit: "600gm", price: 55, categoryId: CAT.CLEANING },
  { name: "Seller Vetra Acid Based Tile Cleaner", unit: "250ml", price: 80, categoryId: CAT.CLEANING },
  { name: "Zovito Toilet Cleaner", unit: "1 Litre", price: 170, categoryId: CAT.CLEANING },
  { name: "Selzer Fennel Floor & Bathroom Cleaner", unit: "1 Litre", price: 74, categoryId: CAT.CLEANING },
  { name: "Tide Fresh And Clean", unit: "1kg", price: 79, categoryId: CAT.CLEANING },

  // ---- HOME / OFFICE (fresheners + pest control) --------------------------
  { name: "Mortein Mosquito Machine (Fragrance of Mandarin & Neroli, Free Machine)", unit: "1 unit", price: 100, categoryId: CAT.HOME_OFFICE },
  { name: "Max Genius Automatic Mosquito Refill + Vaporising Machine", unit: "45ml + 1 unit", price: 156, categoryId: CAT.HOME_OFFICE },
  { name: "Max Genius Mosquito Cutter Refill", unit: "1 unit", price: 100, categoryId: CAT.HOME_OFFICE },
  { name: "Oura Air Freshener Floral Bouquet", unit: "220ml", price: 169, categoryId: CAT.HOME_OFFICE },
  { name: "Pour Home Room Freshener", unit: "220ml (126gm)", price: 169, categoryId: CAT.HOME_OFFICE },
  { name: "Odonil Mystic Rose Air Freshener (5N)", unit: "240gm", price: 245, mrp: 345, categoryId: CAT.HOME_OFFICE },
  { name: "Odonil Lavender Meadows (5N)", unit: "240gm", price: 245, mrp: 354, categoryId: CAT.HOME_OFFICE },

  // ---- SWEET TOOTH (ice creams / kulfi) -----------------------------------
  { name: "Sudha Dairy Rich Rabri Malai Kulfi", unit: "25ml", price: 10, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Resile Aam Ice Cream", unit: "60ml", price: 30, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Mini Chocobar Ice Cream", unit: "30ml", price: 10, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Dairy Rich Crunchy Punchy", unit: "60ml", price: 30, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Gold Cone Ice Cream Chocolate", unit: "120ml", price: 60, categoryId: CAT.SWEET_TOOTH }, // NOTE: source list has this twice at 50rs AND 60rs — using 60rs, confirm with Dev
  { name: "Sudha Gold Cone Ice Cream Butter Scotch", unit: "120ml", price: 50, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Rajbhog Matka", unit: "100ml", price: 50, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Mama Kulfi", unit: "60ml", price: 40, categoryId: CAT.SWEET_TOOTH },
  { name: "Golden Chocolate Sundae", unit: "150ml", price: 35, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Kulfi", unit: "60ml", price: 30, categoryId: CAT.SWEET_TOOTH },
  { name: "Golden Exotica Belgium Dark Chocolate", unit: "100ml", price: 40, categoryId: CAT.SWEET_TOOTH },
  { name: "Golden Exotica American Nuts", unit: "100ml", price: 45, categoryId: CAT.SWEET_TOOTH },
  { name: "Golden Makhan Matka", unit: "60ml", price: 30, categoryId: CAT.SWEET_TOOTH },
  { name: "Golden Tutti Frutti", unit: "100ml", price: 20, categoryId: CAT.SWEET_TOOTH },
  { name: "Golden Delightful Vanilla", unit: "500ml", price: 75, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Ice Cream Fig And Honey", unit: "750ml", price: 190, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Mango Mazza", unit: "750ml", price: null, categoryId: CAT.SWEET_TOOTH }, // NO PRICE GIVEN
  { name: "Sudha Premium Caramel Crunch Ice Cream", unit: "750ml", price: null, categoryId: CAT.SWEET_TOOTH }, // NO PRICE GIVEN
  { name: "Golden Vanilla Ice Cream", unit: "1000ml", price: 150, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Vanilla Medium Fat Ice Cream", unit: "1250ml", price: 120, categoryId: CAT.SWEET_TOOTH },
  { name: "Sudha Butter Scotch Medium Fat Ice Cream", unit: "1250ml", price: 120, categoryId: CAT.SWEET_TOOTH },

  // ---- DAIRY / BREAD / EGGS -----------------------------------------------
  { name: "Super Fresh Atta Bread", unit: "400gm", price: 45, categoryId: CAT.DAIRY_BREAD_EGGS },
  { name: "Super Fresh Long Loaf Sliced Bread", unit: "400gm", price: 45, categoryId: CAT.DAIRY_BREAD_EGGS },

  // ---- ORGANIC / HEALTHY (dry fruits) --------------------------------------
  { name: "Lion Arabian Dates (Buy 1 Get 1 Free)", unit: "500gm", price: 284, categoryId: CAT.ORGANIC_HEALTHY },
  { name: "Kismis", unit: "200gm", price: 120, categoryId: CAT.ORGANIC_HEALTHY },
  { name: "Mahagulla Chuhera", unit: "200gm", price: 120, categoryId: CAT.ORGANIC_HEALTHY },
  { name: "Moongfali (Badam)", unit: "100gm", price: 17, categoryId: CAT.ORGANIC_HEALTHY },

  // ---- ATTA, RICE & DAL -----------------------------------------------------
  { name: "Sugar", unit: "1kg", price: 48, categoryId: CAT.ATTA_RICE_DAL },
  { name: "Rakesh Chana Sattu", unit: "200gm", price: 52, categoryId: CAT.ATTA_RICE_DAL },
  { name: "Rakesh Chana Dal Besan", unit: "250g", price: 47, categoryId: CAT.ATTA_RICE_DAL },

  // ---- MASALA, OIL & MORE -----------------------------------------------------
  { name: "Rakesh Baking Powder", unit: "100gm", price: 25, categoryId: CAT.MASALA_OIL },
  { name: "Rakesh Kesari Synthetic Food Colour", unit: "100gm", price: 43, categoryId: CAT.MASALA_OIL },
  { name: "MDH Peacock Kasoori Methi", unit: "50gm", price: 56, categoryId: CAT.MASALA_OIL },
  { name: "Panch Phoran", unit: "100gm", price: 26, categoryId: CAT.MASALA_OIL },
  {
    name: "Dhara Mustard Oil",
    unit: "1 Litre",
    price: 248,
    categoryId: CAT.MASALA_OIL,
    variantGroup: "dhara-mustard-oil",
    variantType: "size",
    variantLabel: "1 Litre",
  },
  {
    name: "Dhara Mustard Oil",
    unit: "500ml (455g)",
    price: 115,
    categoryId: CAT.MASALA_OIL,
    variantGroup: "dhara-mustard-oil",
    variantType: "size",
    variantLabel: "500ml",
  },

  // ---- BREAKFAST / INSTANT FOOD -----------------------------------------------
  { name: "Morton Corn Flakes Crunchy And Tasty", unit: "500g", price: 130, categoryId: CAT.BREAKFAST_INSTANT },
  { name: "Kellogg's Corn Flakes Original", unit: "275g", price: 95, categoryId: CAT.BREAKFAST_INSTANT },
  { name: "Kellogg's Multigrain Chocos", unit: "127gm", price: 75, categoryId: CAT.BREAKFAST_INSTANT },
  { name: "Haldiram Vermicelli Seviyan", unit: "200g", price: 20, categoryId: CAT.BREAKFAST_INSTANT },
  { name: "Kellogg's Millet Musli", unit: "500g", price: 370, categoryId: CAT.BREAKFAST_INSTANT },
  { name: "Morton Oats", unit: "500gm", price: 125, categoryId: CAT.BREAKFAST_INSTANT },
];

// ---------------------------------------------------------------------
// 2. DB CONNECTION
// ---------------------------------------------------------------------
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found in .env");
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");
}

// ---------------------------------------------------------------------
// 3. MAIN SEED FUNCTION
// ---------------------------------------------------------------------
async function seed() {
  await connectDB();

  let created = 0;
  let updated = 0;
  let flaggedNoPrice = 0;
  let flaggedNoCategory = 0;

  for (const item of RAW_PRODUCTS) {
    if (!item.categoryId) {
      console.warn(`⚠️  No categoryId set for "${item.name}" — skipping category assignment.`);
      flaggedNoCategory++;
    }

    const hasPrice = item.price != null;
    if (!hasPrice) flaggedNoPrice++;

    const doc = {
      name: item.name,
      unit: item.unit,
      category: item.categoryId ? [item.categoryId] : [],
      subCategory: [], // no reliable auto-match — assign manually in admin panel
      variantGroup: item.variantGroup || "",
      variantType: item.variantType || "size",
      variantLabel: item.variantLabel || "",
      variantColor: "",
      sellerPrice: hasPrice ? item.price : 0,
      snapitMargin: 0,
      discount: item.mrp ? item.mrp - item.price : null,
      description: hasPrice
        ? ""
        : "⚠️ NEEDS PRICE — auto-imported without a price, currently unpublished.",
      publish: hasPrice, // unpublished until price is fixed
      image: [],
      store_inventory: [
        {
          store_name: STORE_NAME,
          sellerId: SELLER_ID,
          stock: DEFAULT_STOCK,
          isAvailable: hasPrice,
        },
      ],
    };

    // Upsert by name + unit so re-running this script is safe
    const existing = await ProductModel.findOne({ name: doc.name, unit: doc.unit });

    if (existing) {
      Object.assign(existing, doc);
      await existing.save(); // triggers pre-save hook (price calc, stock rollup)
      updated++;
    } else {
      const newProduct = new ProductModel(doc);
      await newProduct.save(); // triggers pre-save hook
      created++;
    }
  }

  console.log("\n----------------------------------------");
  console.log(`✅ Done. Created: ${created}, Updated: ${updated}`);
  console.log(`⚠️  Products missing a price (saved unpublished): ${flaggedNoPrice}`);
  console.log(`⚠️  Products missing a categoryId: ${flaggedNoCategory}`);
  console.log(`Total products in list: ${RAW_PRODUCTS.length}`);
  console.log("Fix priceless items manually in the admin panel, then flip publish: true.");
  console.log("----------------------------------------\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});