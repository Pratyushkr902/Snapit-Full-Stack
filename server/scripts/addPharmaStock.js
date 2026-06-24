import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

import ProductModel from "../models/product.model.js";

await mongoose.connect(process.env.MONGODB_URI);

// Get ALL products that belong to pharmacy category by checking existing store_inventory
// Also search by broad name keywords
const products = await ProductModel.find({
    $or: [
        { name: /medicine|tablet|capsule|syrup|cream|ointment|bandage|sanitizer|mask|paracetamol|dolo|vicks|dettol|disprin|crocin|diaper|baby|infant|lotion|powder|shampoo|soap|toothpaste|vitamin|supplement|protein|health|wellness|pain|fever|cold|cough|antiseptic|cotton|gauze|gloves|thermometer|bp|sugar|glucose|insulin/i },
        { "store_inventory.store_name": "PharmaWellness" }
    ]
});

console.log("Total products found:", products.length);

let updated = 0;
for (const p of products) {
    const alreadyHas = p.store_inventory?.some(s => s.store_name === "PharmaWellness");
    if (!alreadyHas) {
        const ref = p.store_inventory?.[0];
        p.store_inventory.push({
            store_name:  "PharmaWellness",
            stock:       100,
            price:       ref?.price       || 0,
            sellerPrice: ref?.sellerPrice || 0,
        });
        await p.save();
        updated++;
    }
}

console.log(`✅ Added PharmaWellness to ${updated} new products`);
await mongoose.disconnect();
