/**
 * cleanup-cloudinary.js
 *
 * Finds Cloudinary images NOT referenced by any model in your DB,
 * and deletes them (only when you pass --confirm).
 *
 * Models checked:
 *   - Product      → image[]
 *   - Category     → image
 *   - SubCategory  → image
 *   - User         → avatar
 *   - Restaurant   → image, logo
 *   - MenuItem     → image
 *   - FoodItem     → image
 *
 * USAGE:
 *   node cleanup-cloudinary.js                # DRY RUN - lists orphans, deletes nothing
 *   node cleanup-cloudinary.js --confirm      # ACTUALLY deletes orphaned images
 */

import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// ---- CONFIG ---------------------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DRY_RUN = !process.argv.includes("--confirm");

// ---- MINIMAL SCHEMAS (just the image fields) ------------------------------

const models = [
    {
        name: "Product",
        collection: "products",
        schema: { image: { type: Array, default: [] } },
        extract: (doc) => (Array.isArray(doc.image) ? doc.image : []),
    },
    {
        name: "Category",
        collection: "categories",
        schema: { image: { type: String, default: "" } },
        extract: (doc) => [doc.image],
    },
    {
        name: "SubCategory",
        collection: "subcategories",
        schema: { image: { type: String, default: "" } },
        extract: (doc) => [doc.image],
    },
    {
        name: "User",
        collection: "users",
        schema: { avatar: { type: String, default: "" } },
        extract: (doc) => [doc.avatar],
    },
    {
        name: "Restaurant",
        collection: "restaurants",
        schema: {
            image: { type: String, default: "" },
            logo:  { type: String, default: "" },
        },
        extract: (doc) => [doc.image, doc.logo],
    },
    {
        name: "MenuItem",
        collection: "menuitems",
        schema: { image: { type: String, default: "" } },
        extract: (doc) => [doc.image],
    },
    {
        name: "FoodItem",
        collection: "fooditems",
        schema: { image: { type: String, default: "" } },
        extract: (doc) => [doc.image],
    },
];

// ---- HELPERS ---------------------------------------------------------------

function extractPublicId(url) {
    if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return null;
    try {
        const afterUpload = url.split("/upload/")[1];
        if (!afterUpload) return null;
        const withoutVersion = afterUpload.replace(/^v\d+\//, "");
        const withoutExt = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, "");
        return withoutExt || null;
    } catch {
        return null;
    }
}

async function getAllUsedPublicIds() {
    const used = new Set();

    for (const m of models) {
        const projection = Object.fromEntries(Object.keys(m.schema).map((k) => [k, 1]));
        const Model = mongoose.model(
            `_cleanup_${m.name}`,
            new mongoose.Schema(m.schema),
            m.collection
        );

        const docs = await Model.find({}, projection).lean();
        let count = 0;
        for (const doc of docs) {
            for (const url of m.extract(doc)) {
                const id = extractPublicId(url);
                if (id) { used.add(id); count++; }
            }
        }
        console.log(`  ${m.name.padEnd(12)} → ${count} image(s) referenced`);
    }

    return used;
}

async function getAllCloudinaryPublicIds() {
    let all = [];
    let nextCursor = undefined;
    do {
        const res = await cloudinary.api.resources({
            type: "upload",
            max_results: 500,
            next_cursor: nextCursor,
        });
        all = all.concat(res.resources.map((r) => r.public_id));
        nextCursor = res.next_cursor;
    } while (nextCursor);
    return all;
}

// ---- MAIN ------------------------------------------------------------------

async function main() {
    console.log(`\nMode: ${DRY_RUN ? "DRY RUN (no deletions)" : "⚠️  LIVE — WILL DELETE ORPHANS"}\n`);

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.\n");
    console.log("Scanning models for referenced images...");

    const usedIds = await getAllUsedPublicIds();
    console.log(`\nTotal unique images referenced across all models: ${usedIds.size}`);

    const allCloudinaryIds = await getAllCloudinaryPublicIds();
    console.log(`Total images in Cloudinary: ${allCloudinaryIds.length}`);

    const orphans = allCloudinaryIds.filter((id) => !usedIds.has(id));
    console.log(`\nOrphaned images (not referenced by any model): ${orphans.length}\n`);
    orphans.forEach((id) => console.log("  -", id));

    if (DRY_RUN) {
        console.log("\nDry run complete. No images were deleted.");
        console.log("Review the list above, then re-run with --confirm to delete them.");
    } else {
        console.log("\nDeleting orphaned images...");
        for (let i = 0; i < orphans.length; i += 100) {
            const batch = orphans.slice(i, i + 100);
            const result = await cloudinary.api.delete_resources(batch);
            console.log(`Batch ${Math.floor(i / 100) + 1} deleted:`, result);
        }
        console.log("\nDone. All orphaned images deleted.");
    }

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});