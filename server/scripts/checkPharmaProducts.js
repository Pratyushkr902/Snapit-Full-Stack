import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

import ProductModel from "../models/product.model.js";

await mongoose.connect(process.env.MONGODB_URI);
const count = await ProductModel.countDocuments({ "stock.store_name": "PharmaWellness" });
console.log("PharmaWellness products:", count);
await mongoose.disconnect();
