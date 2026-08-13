import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

import ProductModel from "../models/product.model.js";

const PHARMA_ID = new mongoose.Types.ObjectId('69b57215a8b9adccd30c61c5');
const BABY_ID   = new mongoose.Types.ObjectId('69b57091a8b9adccd30c61a4');

const BABY_KEYWORDS   = ['diaper', 'huggies', 'mamypoko', 'pampers', 'pant', 'nestle', 'lactogen', 'nan', 'ceregrow', 'slurrp', 'formula', 'cereal', 'baby', 'infant', 'chicco', 'himalaya baby'];
const PHARMA_KEYWORDS = ['medicine', 'tablet', 'capsule', 'syrup', 'cream', 'ointment', 'bandage', 'sanitizer', 'mask', 'paracetamol', 'dolo', 'vicks', 'dettol', 'disprin', 'crocin', 'moov', 'eno', 'pudin', 'vitamin', 'evion', 'thermometer', 'oximeter', 'antiseptic', 'savlon', 'boroline', 'zandu', 'balm', 'pain relief', 'glucoplus'];

await mongoose.connect(process.env.MONGODB_URI);

const products = await ProductModel.find({
    name: /diaper|baby|huggies|pampers|mamypoko|lactogen|nan|ceregrow|medicine|tablet|capsule|syrup|dettol|vicks|dolo|crocin|moov|eno|vitamin|thermometer|antiseptic|savlon|zandu|balm/i
});

console.log("Found:", products.length, "products to check");

let updated = 0;
for (const p of products) {
    const name = (p.name || '').toLowerCase();
    const isBaby   = BABY_KEYWORDS.some(k => name.includes(k));
    const isPharma = PHARMA_KEYWORDS.some(k => name.includes(k));

    const targetId = isBaby ? BABY_ID : isPharma ? PHARMA_ID : null;
    if (!targetId) continue;

    const already = p.category?.some(c => c.toString() === targetId.toString());
    if (!already) {
        p.category = [...(p.category || []), targetId];
        await p.save();
        updated++;
        console.log("✅", p.name, "→", isBaby ? "BabyCare" : "Pharma Wellness");
    }
}

console.log(`\n✅ Updated ${updated} products`);
await mongoose.disconnect();
