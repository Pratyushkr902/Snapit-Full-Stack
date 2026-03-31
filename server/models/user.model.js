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
        enum : ['ADMIN',"USER"],
        default : "USER"
    },
    // --- SNAPIT WALLET SYSTEM ---
    walletBalance: {
        type: Number,
        default: 0
    },
    walletTransactions: [
        {
            type: {
                type: String,  // 'credit' or 'debit'
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
    // NEW: Prevents double-claiming of referral rewards
    firstOrderBonusApplied: {
        type: Boolean,
        default: false
    }
},{
    timestamps : true
})

const UserModel = mongoose.model("User",userSchema)

export default UserModel