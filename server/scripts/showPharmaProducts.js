import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

import ProductModel from "../models/product.model.js";

await mongoose.connect(process.env.MONGODB_URI);
const products = await ProductModel.find({
    name: /medicine|tablet|capsule|syrup|cream|ointment|bandage|sanitizer|mask|paracetamol|dolo|vicks|dettol|disprin|crocin/i
}).select("name stock").lean();

console.log("Found:", products.length);
products.forEach(p => console.log("-", p.name, "|", p.stock?.map(s => s.store_name)));
await mongoose.disconnect();
