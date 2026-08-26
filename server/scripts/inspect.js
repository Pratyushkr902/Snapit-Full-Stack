/**
 * inspect.js
 * ------------------------------------------------------------
 * Run this once to print everything needed to build the correct
 * product-reassignment script. It does NOT change any data.
 *
 * Usage:
 *   npm install mongodb   (if not already installed)
 *   node inspect.js "your_mongodb_connection_string" "your_db_name"
 *
 * Then copy the full console output and send it back.
 * ------------------------------------------------------------
 */

const { MongoClient } = require("mongodb");

const uri = process.argv[2];
const dbName = process.argv[3];

if (!uri || !dbName) {
  console.error("Usage: node inspect.js <connection_string> <db_name>");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.log("\n================ COLLECTIONS ================");
  const collections = await db.listCollections().toArray();
  console.log(collections.map(c => c.name));

  console.log("\n================ SELLERS (shop docs) ================");
  const sellers = await db.collection("sellers").find({}).limit(20).toArray();
  console.log(JSON.stringify(sellers, null, 2));

  console.log("\n================ CATEGORIES (if separate collection) ================");
  try {
    const categories = await db.collection("categories").find({}).limit(50).toArray();
    console.log(JSON.stringify(categories, null, 2));
  } catch (e) {
    console.log("No 'categories' collection or error reading it:", e.message);
  }

  console.log("\n================ SAMPLE PRODUCTS (5 docs) ================");
  const products = await db.collection("products").find({}).limit(5).toArray();
  console.log(JSON.stringify(products, null, 2));

  console.log("\n================ USERS WITH role SELLER ================");
  const sellerUsers = await db.collection("users")
    .find({ role: "SELLER" })
    .project({ name: 1, store_name: 1, email: 1 })
    .toArray();
  console.log(JSON.stringify(sellerUsers, null, 2));

  await client.close();
  console.log("\nDone. Copy everything above and send it back.");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
