const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "server", ".env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const APPLY_FIX = process.argv.includes("--fix");

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

  const badDocs = await collection
    .find({
      category: { $exists: true, $type: "string" },
    })
    .project({ _id: 1, name: 1, variantLabel: 1, category: 1 })
    .toArray();

  console.log(`Found ${badDocs.length} product(s) with a string category (likely the cause of the 500):\n`);
  badDocs.forEach((d) => {
    console.log(`  - ${d.name}${d.variantLabel ? " (" + d.variantLabel + ")" : ""} | category: "${d.category}" | _id: ${d._id}`);
  });

  if (badDocs.length === 0) {
    console.log("\nNo string-category docs found. The 500 may have a different cause — paste server logs for the /api/product/get route.");
    await mongoose.disconnect();
    return;
  }

  if (!APPLY_FIX) {
    console.log("\n⚠️  Dry run only. Re-run with --fix to unset `category` on these docs and restore the API:");
    console.log("    node fix-bad-category.cjs --fix");
  } else {
    const ids = badDocs.map((d) => d._id);
    const result = await collection.updateMany(
      { _id: { $in: ids } },
      { $unset: { category: "" } }
    );
    console.log(`\n✅ Fixed ${result.modifiedCount} document(s). category field removed.`);
    console.log("Reload snapit.pages.dev and confirm /api/product/get now returns 200.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
