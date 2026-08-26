// Backfills cartItems[].name / cartItems[].image on existing orders that
// predate the fix in buildTaggedCartItems. Those orders' cartItems were
// saved without a per-item name, so invoices/order-detail views fell back
// to the order-level summary label (e.g. "Fresh Onion (Pyaz) (+5 more)")
// for every single row.
//
// Usage:
//   node migrations/backfill_cartitem_names.js --dry-run   (preview only)
//   node migrations/backfill_cartitem_names.js              (apply)
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js";

// Resolve server/.env regardless of the current working directory this
// script is invoked from (e.g. repo root vs server/).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const DRY_RUN = process.argv.includes("--dry-run");

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected. ${DRY_RUN ? "DRY RUN — no writes will be made." : "LIVE — writes will be applied."}\n`);

    const orders = await OrderModel.find({
        $or: [
            { "cartItems.name": { $in: [null, ""] } },
            { "cartItems.name": { $exists: false } },
        ],
    });

    console.log(`Found ${orders.length} order(s) with at least one unnamed cart item.\n`);

    const productCache = new Map();
    const getProduct = async (productId) => {
        const key = productId?.toString();
        if (!key) return null;
        if (productCache.has(key)) return productCache.get(key);
        const p = await ProductModel.findById(key).select("name image").lean();
        productCache.set(key, p);
        return p;
    };

    let ordersFixed = 0;
    let itemsFixed = 0;
    let itemsUnresolved = 0;

    for (const order of orders) {
        let changed = false;

        for (const item of order.cartItems) {
            if (item.name) continue;

            const product = await getProduct(item.productId);
            if (!product) {
                itemsUnresolved++;
                console.log(`  ⚠️  ${order.orderId}: product ${item.productId} no longer exists — left blank`);
                continue;
            }

            item.name = product.name || "";
            item.image = product.image?.[0] || "";
            changed = true;
            itemsFixed++;
        }

        if (changed) {
            ordersFixed++;
            if (DRY_RUN) {
                console.log(`  Would update ${order.orderId}: ${order.cartItems.map(i => i.name).join(", ")}`);
            } else {
                await order.save();
            }
        }
    }

    console.log(`\n=== ${DRY_RUN ? "DRY RUN COMPLETE" : "BACKFILL COMPLETE"} ===`);
    console.log(`Orders updated:      ${ordersFixed}`);
    console.log(`Cart items fixed:    ${itemsFixed}`);
    console.log(`Items left blank:    ${itemsUnresolved} (product no longer exists in DB)`);
    if (DRY_RUN) console.log(`\nRe-run without --dry-run to apply these changes.`);

    await mongoose.disconnect();
}

run().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
