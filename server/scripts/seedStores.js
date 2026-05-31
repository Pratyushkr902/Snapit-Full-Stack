import mongoose from "mongoose";
import StoreModel from "../models/store.model.js";
import dotenv from "dotenv";
dotenv.config();

const STORES = [
    {
        name:     "Pali Mega Mart",
        address:  "Paliganj, Bihar",
        category: "grocery",
        location: { type: "Point", coordinates: [84.80167031847012, 25.329159207821725] }
    },
    {
        name:     "Monginis",
        address:  "Paliganj, Bihar",
        category: "bakery",
        location: { type: "Point", coordinates: [84.80167031847012, 25.329159207821725] }
    },
    {
        name:     "Fresh Fruits Shop",
        address:  "Paliganj, Bihar",
        category: "fruits",
        location: { type: "Point", coordinates: [84.801555, 25.329462] }
    },
    {
        name:     "Egg Shop",
        address:  "Paliganj, Bihar",
        category: "eggs",
        location: { type: "Point", coordinates: [84.800339, 25.330740] }
    },
    {
        name:     "Cold Drink & Energy Drink Shop",
        address:  "Paliganj, Bihar",
        category: "drinks",
        location: { type: "Point", coordinates: [84.803775, 25.333580] }
    }
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to DB");

    for (const s of STORES) {
        const exists = await StoreModel.findOne({ name: s.name });
        if (exists) {
            console.log(`⏭  Already exists: ${s.name}`);
            continue;
        }
        await StoreModel.create(s);
        console.log(`✅ Added: ${s.name}`);
    }

    await mongoose.disconnect();
    console.log("🎉 Done. All stores seeded.");
}

seed().catch(err => { console.error(err); process.exit(1); });
