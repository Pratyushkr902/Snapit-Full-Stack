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
        enum : ['ADMIN', 'USER', 'RIDER', 'rider', 'SELLER', 'RESTO_SELLER'],
        default : "USER"
    },
    store_name : {
        type : String,
        default : null
    },
    // Restaurant this user owns — set when role is RESTO_SELLER
    restaurantId : {
        type : mongoose.Schema.ObjectId,
        ref : 'Restaurant',
        default : null
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    walletTransactions: [
        {
            type: { type: String, required: true },
            amount: { type: Number, required: true },
            description: { type: String },
            date: { type: Date, default: Date.now }
        }
    ],
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
    wishlist: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'product'
        }
    ],
    fcmToken: {
        type: String,
        default: null
    },
    isSnapitPlusMember: {
        type: Boolean,
        default: false
    },
    snapitPlusExpiresAt: {
        type: Date,
        default: null
    },
    walletCashbackThisMonth: {
        type: Number,
        default: 0
    },
    walletCashbackMonthKey: {
        type: String,
        default: ''
    },
    currentStreak: {
        type: Number,
        default: 0
    },
    lastOrderDate: {
        type: Date,
        default: null
    },
    claimedMilestones: {
        type: [Number],
        default: []
    },
    coins: {
        type: Number,
        default: 0
    },
    lastCheckin: {
        type: Date,
        default: null
    },
    checkinHistory: {
        type: [Date],
        default: []
    },
    usedPromoCodes: {
        type: [String],
        default: []
    },
    // ── New: Birthday Bonus / Surprise Box / Express fields ─────────────────
    dob: {
        type: Date,
        default: null
    },
    birthdayBonusClaimedYear: {
        type: Number,
        default: null
    },
    lastSurpriseBoxAt: {
        type: Date,
        default: null
    },
    isExpressMember: {
        type: Boolean,
        default: false
    }
},{
    timestamps : true
})

const UserModel = mongoose.model("User", userSchema)
export default UserModel;