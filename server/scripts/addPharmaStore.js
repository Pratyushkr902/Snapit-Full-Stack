import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

import StoreModel from "../models/store.model.js";
import UserModel  from "../models/user.model.js";

await mongoose.connect(process.env.MONGODB_URI);

// 1. Create the store
const existing = await StoreModel.findOne({ name: "PharmaWellness" });
if (!existing) {
    await StoreModel.create({
        name:     "PharmaWellness",
        address:  "Paliganj, Bihar",
        phone:    "",
        category: "general",
        location: { type: "Point", coordinates: [84.800609, 25.330951] },
        isActive: true,
    });
    console.log("✅ Store created: PharmaWellness");
} else {
    console.log("ℹ️  Store already exists");
}

// 2. Assign Chandan to it
const result = await UserModel.findByIdAndUpdate(
    "6a2ec0fc4e5b4077a6af8c51",
    { store_name: "PharmaWellness", role: "SELLER" },
    { new: true }
).select("name email role store_name");

console.log("✅ Seller updated:", result);

await mongoose.disconnect();
