import mongoose from "mongoose";
import "dotenv/config";
import ProductModel from "../models/product.model.js";
import MenuItemModel from "../models/MenuItem.model.js";

const MONGINIS_RESTAURANT_ID = "6a46bb7a9f1ccf1a11c9be0f";

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected. Restoring Monginis to grocery...");

    const menuItems = await MenuItemModel.find({ restaurantId: MONGINIS_RESTAURANT_ID });
    const names = menuItems.map(m => m.name);
    console.log(`Found ${names.length} menu items to match back to products.`);

    const products = await ProductModel.find({ name: { $in: names } });
    console.log(`Matched ${products.length} grocery products by name.`);

    let restored = 0;
    for (const p of products) {
        const alreadyHas = p.store_inventory.some(inv => inv.store_name === "Monginis");
        if (!alreadyHas) {
            p.store_inventory.push({
                store_name: "Monginis",
                sellerId: "6a33e795a088fc695fe658c0",
                stock: 10,
                isAvailable: true
            });
        }
        p.publish = true;
        await p.save();
        restored++;
    }

    console.log(`✅ Restored ${restored} products to grocery (Monginis store_inventory re-added, republished).`);
    console.log("⚠️  Stock defaulted to 10 — adjust manually if needed.");
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Failed:", err);
    process.exit(1);
});
