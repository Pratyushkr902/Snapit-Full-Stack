import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true,"Provide name"]
    },
    email : {
        type : String,
        required : [true, "provide email"],
        unique : true
    },
    password : {
        type : String,
        required : [true, "provide password"]
    },
    avatar : {
        type : String,
        default : ""
    },
    mobile : {
        type : Number,
        default : null
    },
    refresh_token : {
        type : String,
        default : ""
    },
    verify_email : {
        type : Boolean,
        default : false
    },
    last_login_date : {
        type : Date,
        default : null 
    },
    status : {
        type : String,
        enum : ["Active","Inactive","Suspended"],
        default : "Active"
    },
    address_details : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'address'
        }
    ],
    shopping_cart : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'cartProduct'
        }
    ],
    orderHistory : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'order'
        }
    ],
    forgot_password_otp : {
        type : String,
        default : null
    },
    forgot_password_expiry : {
        type : Date,
        default : null 
    },
    role : {
        type : String,
        // FIX: Added SELLER and RIDER to the enum so they are valid roles
        enum : ['ADMIN', 'USER', 'RIDER', 'rider', 'SELLER'],
        default : "USER"
    },
    // FIX: store_name links a SELLER user to their store in product.store_inventory
    // When a seller registers, save their store name here.
    // This must exactly match the store_name used in product.store_inventory.
    store_name : {
        type : String,
        default : null
    },
    // --- SNAPIT WALLET SYSTEM ---
    walletBalance: {
        type: Number,
        default: 0
    },
    walletTransactions: [
        {
            type: {
                type: String,
                required: true
            },
            amount: {
                type: Number,
                required: true
            },
            description: {
                type: String
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ],
    // --- SNAPIT REFERRAL SYSTEM ---
    referralCode: {
        type: String,
        unique: true,
        sparse: true 
    },
    referredBy: {
        type: String,
        default: null
    },
    referralCount: {
        type: Number,
        default: 0
    },
    firstOrderBonusApplied: {
        type: Boolean,
        default: false
    },
    // --- WISHLIST ---
    wishlist: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'product'
        }
    ],
    // --- PUSH NOTIFICATIONS ---
    fcmToken: {
        type: String,
        default: null
    },
    // --- SNAPITPLUS SUBSCRIPTION LAYER ---
    isSnapitPlusMember: {
        type: Boolean,
        default: false
    },
    snapitPlusExpiresAt: {
        type: Date,
        default: null
    }
},{
    timestamps : true
})

const UserModel = mongoose.model("User", userSchema)
export default UserModel;