import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

import CategoryModel from "../models/category.model.js";

await mongoose.connect(process.env.MONGODB_URI);
const cats = await CategoryModel.find().select("name _id").lean();
cats.forEach(c => console.log(c._id, "-", c.name));
await mongoose.disconnect();
