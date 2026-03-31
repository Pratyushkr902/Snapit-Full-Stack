import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name : {
        type : String,
        required: [true, "Product name is required"]
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
            ref : 'subCategory' 
        }
    ],
    unit : {
        type : String,
        default : ""
    },
    // SUPPORT FOR 5-6 MARTS: Each tracks its own stock
    store_inventory: [
        {
            store_name: { type: String, required: true }, 
            stock: { type: Number, default: 0 },
            isAvailable: { type: Boolean, default: true }
        }
    ],
    // Total Stock (Calculated automatically via middleware)
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
    },
    // --- SNAPIT FLASH SALE SYSTEM ---
    flashSale: {
        isActive: {
            type: Boolean,
            default: false
        },
        discountPercent: {
            type: Number,
            default: 0
        },
        startTime: {
            type: Date
        },
        endTime: {
            type: Date
        },
        originalPrice: {
            type: Number
        }
    }
},{
    timestamps : true
})

// CREATE TEXT INDEX FOR SEARCH
productSchema.index({
    name  : "text",
    description : 'text'
},{
    weights: {
        name : 10,
        description : 5
    }
})

// MULTI-STORE & FLASH SALE MIDDLEWARE
productSchema.pre('save', async function() {
    // 1. Calculate Total Stock from all stores combined
    if (Array.isArray(this.store_inventory) && this.store_inventory.length > 0) {
        this.stock = this.store_inventory.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
    } else {
        // Fallback: Create default Paliganj entry if empty
        this.store_inventory = [{
            store_name: "Snapit Main Store - Paliganj",
            stock: Number(this.stock) || 0,
            isAvailable: true
        }];
    }

    // 2. Flash Sale Logic Integration
    if (this.flashSale?.isActive) {
        // Auto-update the main discount field if Flash Sale is on
        this.discount = this.flashSale.discountPercent;
        
        // Ensure we store the original price for restoration after sale
        if (!this.flashSale.originalPrice) {
            this.flashSale.originalPrice = this.price;
        }
    }

    // 3. Auto-unpublish ONLY if total global stock hits 0
    if (this.isModified('stock') || this.isModified('store_inventory')) {
        if (this.stock <= 0) {
            this.publish = false;
            console.log(`[SNAPIT]: ${this.name} marked OUT OF STOCK.`);
        } else {
            this.publish = true; 
        }
    }
});

const ProductModel = mongoose.model('product',productSchema)

export default ProductModel;