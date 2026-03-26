import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name : {
        type : String,
        required: [true, "Product name is required"] // Added for better error reporting
    },
    image : {
        type : Array,
        default : []
    },
    category : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'category'
        }
    ],
    subCategory : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'subCategory' // FIXED: Match the model name exactly as registered in subCategory.model.js
        }
    ],
    unit : {
        type : String,
        default : ""
    },
    // FIXED: Support for 5-6 Marts. Each Mart tracks its own stock.
    store_inventory: [
        {
            store_name: { type: String, required: true }, 
            stock: { type: Number, default: 0 },
            isAvailable: { type: Boolean, default: true }
        }
    ],
    // Kept for backward compatibility and Total Stock calculation
    stock : {
        type : Number,
        default : 0 
    },
    price : {
        type : Number,
        default : null 
    },
    discount : {
        type : Number,
        default : null
    },
    description : {
        type : String,
        default : ""
    },
    more_details : {
        type : Object,
        default : {}
    },
    publish : {
        type : Boolean,
        default : true
    }
},{
    timestamps : true
})

// CREATE TEXT INDEX
productSchema.index({
    name  : "text",
    description : 'text'
},{
    weights: {
        name : 10,
        description : 5
    }
})

// MULTI-STORE MIDDLEWARE
// FIXED: Removed 'next' and ensured async/await flow to prevent TypeError
productSchema.pre('save', async function() {
    // 1. Calculate Total Stock from all stores combined
    if (Array.isArray(this.store_inventory) && this.store_inventory.length > 0) {
        this.stock = this.store_inventory.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
    } else {
        // Fallback: If inventory is empty, create a default entry
        this.store_inventory = [{
            store_name: "Snapit Main Store - Paliganj",
            stock: Number(this.stock) || 0,
            isAvailable: true
        }];
    }

    // 2. Auto-unpublish ONLY if total global stock hits 0
    if (this.isModified('stock') || this.isModified('store_inventory')) {
        if (this.stock <= 0) {
            this.publish = false;
            console.log(`[SNAPIT MULTI-STORE]: ${this.name} is OUT OF STOCK everywhere.`);
        } else {
            this.publish = true; 
        }
    }
});

const ProductModel = mongoose.model('product',productSchema)

export default ProductModel;