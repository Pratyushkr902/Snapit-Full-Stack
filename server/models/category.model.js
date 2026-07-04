import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name : {
        type : String,
        default : ""
    },
    image : {
        type : String,
        default : ""
    },
    // Optional — small WebP thumbnail, generated at upload time. Purely
    // additive: existing categories without this field just fall back to
    // the full `image` on the frontend, nothing is migrated or backfilled.
    imageThumbnail : {
        type : String,
        default : ""
    }
},{
    timestamps : true
})

const CategoryModel = mongoose.model('category',categorySchema)

export default CategoryModel