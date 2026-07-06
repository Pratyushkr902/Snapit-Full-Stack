const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "server", ".env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const APPLY_DELETE = process.argv.includes("--delete");

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in server/.env");
  process.exit(1);
}

async function main() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected.\n");

  const db = mongoose.connection.db;
  const collection = db.collection("products");

  const query = { variantGroup: "chicken-fresh" };

  const docs = await collection
    .find(query)
    .project({ _id: 1, name: 1, variantLabel: 1, category: 1 })
    .toArray();

  console.log(`Found ${docs.length} product(s) from the chicken import:\n`);
  docs.forEach((d) => {
    console.log(`  - ${d.name}${d.variantLabel ? " (" + d.variantLabel + ")" : ""} | category: ${JSON.stringify(d.category)} | _id: ${d._id}`);
  });

  if (docs.length === 0) {
    console.log("\nNothing found with variantGroup 'chicken-fresh'. Nothing to remove.");
    await mongoose.disconnect();
    return;
  }

  if (!APPLY_DELETE) {
    console.log("\n⚠️  Dry run only. Re-run with --delete to actually remove these docs:");
    console.log("    node remove-chicken-import.cjs --delete");
  } else {
    const result = await collection.deleteMany(query);
    console.log(`\n✅ Deleted ${result.deletedCount} document(s).`);
    console.log("Reload snapit.pages.dev / ProductAdmin and confirm /api/product/get returns 200.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
