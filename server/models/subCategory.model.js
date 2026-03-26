import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema({
    name : {
        type : String,
        default : ""
    },
    image : {
        type : String,
        default : ""
    },
    category : [
        {
            type : mongoose.Schema.ObjectId,
            ref : "category"
        }
    ]
},{
    timestamps : true
})

// FIXED: Registered as 'subCategory' to match your Route and Controller imports
// This ensures that when ProductModel looks for 'subCategory', it finds this schema.
const SubCategoryModel = mongoose.model('subCategory',subCategorySchema)

export default SubCategoryModel