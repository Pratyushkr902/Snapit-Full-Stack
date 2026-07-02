import mongoose from "mongoose";
import "dotenv/config";
import "../models/category.model.js";
import "../models/subCategory.model.js";
import UserModel from "../models/user.model.js";
import ProductModel from "../models/product.model.js";
import RestaurantModel from "../models/restaurant.model.js";
import MenuItemModel from "../models/MenuItem.model.js";

const MONGINIS_USER_ID = "6a33e795a088fc695fe658c0";
const MONGINIS_STORE_NAME = "Monginis";

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected. Starting Monginis → Food migration...");

    const sellerUser = await UserModel.findById(MONGINIS_USER_ID);
    if (!sellerUser) {
        console.error("❌ Monginis seller user not found. Aborting.");
        process.exit(1);
    }
    console.log(`Found seller: ${sellerUser.name} (${sellerUser.email})`);

    const products = await ProductModel.find({
        "store_inventory.store_name": MONGINIS_STORE_NAME
    }).populate("category subCategory");

    console.log(`Found ${products.length} Monginis products to migrate.`);

    if (products.length === 0) {
        console.log("Nothing to migrate. Exiting.");
        process.exit(0);
    }

    let restaurant = await RestaurantModel.findOne({ ownerId: sellerUser._id });
    if (!restaurant) {
        const categoryNames = [
            ...new Set(
                products
                    .flatMap(p => (p.category || []).map(c => c.name))
                    .filter(Boolean)
            )
        ];

        restaurant = await RestaurantModel.create({
            name: "Monginis",
            description: "Cakes, pastries & bakery items",
            cuisineTypes: ["Bakery", "Desserts"],
            menuCategories: categoryNames.length > 0 ? categoryNames : ["Cakes", "Pastries"],
            isOpen: true,
            isActive: true,
            isPureVeg: false,
            address: { city: "Paliganj" },
            ownerId: sellerUser._id,
        });
        console.log(`✅ Created Restaurant doc: ${restaurant._id}`);
    } else {
        console.log(`Restaurant already exists: ${restaurant._id}`);
    }

    let converted = 0;
    let skipped = 0;
    for (const p of products) {
        const existing = await MenuItemModel.findOne({
            restaurantId: restaurant._id,
            name: p.name
        });
        if (existing) {
            skipped++;
            continue;
        }

        const categoryName = p.category?.[0]?.name || "Bakery";

        await MenuItemModel.create({
            restaurantId: restaurant._id,
            name: p.name,
            description: p.description || "",
            image: Array.isArray(p.image) ? p.image[0] || "" : p.image || "",
            category: categoryName,
            price: p.sellingPrice || p.price || 0,
            discountedPrice: 0,
            snapitMargin: p.snapitMargin || 0,
            isVeg: true,
            isAvailable: p.publish !== false,
        });
        converted++;
    }

    console.log(`✅ Converted: ${converted} | Skipped (already existed): ${skipped}`);

    const productIds = products.map(p => p._id);
    const removeResult = await ProductModel.updateMany(
        { _id: { $in: productIds } },
        {
            $set: { publish: false },
            $pull: { store_inventory: { store_name: MONGINIS_STORE_NAME } }
        }
    );
    console.log(`✅ Unpublished + removed grocery inventory for ${removeResult.modifiedCount} products`);

    sellerUser.role = "RESTO_SELLER";
    sellerUser.restaurantId = restaurant._id;
    await sellerUser.save();
    console.log(`✅ User role updated to RESTO_SELLER, restaurantId set`);

    console.log("\n🎉 Migration complete.");
    console.log(`Restaurant ID: ${restaurant._id}`);
    console.log(`Menu items created: ${converted}`);
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
