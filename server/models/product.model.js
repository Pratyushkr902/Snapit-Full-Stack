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
    // ✅ variantGroup: shared slug to link size variants together
    // e.g. all sizes of "Lays Classic" get variantGroup: "lays-classic"
    // Leave blank if product has no variants
    variantGroup : {
        type : String,
        default : "",
        trim : true,
        index : true  // indexed for fast sibling lookups
    },
    store_inventory: [
        {
            store_name: { type: String, required: true }, 
            stock: { type: Number, default: 0 },
            isAvailable: { type: Boolean, default: true }
        }
    ],
    stock : {
        type : Number,
        default : 0 
    },
    sellerPrice : {
        type : Number,
        default : null
    },
    snapitMargin : {
        type : Number,
        default : 0
    },
    sellingPrice : {
        type : Number,
        default : null
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

productSchema.index({
    name  : "text",
    description : 'text'
},{
    weights: {
        name : 10,
        description : 5
    }
})

productSchema.pre('save', async function() {

    // 1. AUTO CALCULATE sellingPrice from sellerPrice + snapitMargin
    if (this.sellerPrice != null) {
        const margin = Number(this.snapitMargin) || 0;
        this.sellingPrice = Number(this.sellerPrice) + margin;
        this.price = this.sellingPrice;
    }

    // 2. Calculate Total Stock from all stores combined
    if (Array.isArray(this.store_inventory) && this.store_inventory.length > 0) {
        this.stock = this.store_inventory.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
    } else {
        this.store_inventory = [{
            store_name: "Snapit Main Store - Paliganj",
            stock: Number(this.stock) || 0,
            isAvailable: true
        }];
    }

    // 3. Flash Sale Logic
    if (this.flashSale?.isActive) {
        this.discount = this.flashSale.discountPercent;
        if (!this.flashSale.originalPrice) {
            this.flashSale.originalPrice = this.price;
        }
    }
});

const ProductModel = mongoose.model('product',productSchema)

export default ProductModel;