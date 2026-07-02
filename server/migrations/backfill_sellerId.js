import mongoose from "mongoose";
import "dotenv/config";
import UserModel from "../models/user.model.js";
import ProductModel from "../models/product.model.js";
import OrderModel from "../models/order.model.js";

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected. Starting backfill...");

    const sellers = await UserModel.find({ role: "SELLER" }).lean();

    const byStoreName = {};
    for (const s of sellers) {
        const key = s.store_name;
        if (!byStoreName[key]) byStoreName[key] = [];
        byStoreName[key].push(s);
    }

    const uniqueMap = {};
    const ambiguous = [];
    for (const [storeName, list] of Object.entries(byStoreName)) {
        if (list.length === 1) {
            uniqueMap[storeName] = list[0]._id;
        } else {
            ambiguous.push({ storeName, sellers: list.map(s => ({ id: s._id, name: s.name, email: s.email })) });
        }
    }

    console.log("\n=== AMBIGUOUS STORE NAMES (manual fix required) ===");
    console.log(JSON.stringify(ambiguous, null, 2));

    const products = await ProductModel.find({ "store_inventory.0": { $exists: true } });
    let productsUpdated = 0;
    for (const p of products) {
        let changed = false;
        for (const inv of p.store_inventory) {
            if (!inv.sellerId && uniqueMap[inv.store_name]) {
                inv.sellerId = uniqueMap[inv.store_name];
                changed = true;
            }
        }
        if (changed) {
            await p.save();
            productsUpdated++;
        }
    }
    console.log(`\nProducts updated: ${productsUpdated}`);

    const orders = await OrderModel.find({ "cartItems.0": { $exists: true } });
    let ordersUpdated = 0;
    for (const o of orders) {
        let changed = false;
        for (const item of o.cartItems) {
            if (!item.sellerId && item.seller_store_name && uniqueMap[item.seller_store_name]) {
                item.sellerId = uniqueMap[item.seller_store_name];
                changed = true;
            }
        }
        if (changed) {
            await o.save();
            ordersUpdated++;
        }
    }
    console.log(`Orders updated: ${ordersUpdated}`);

    console.log("\nDone. Fix ambiguous sellers manually, then re-run targeted patch if needed.");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
