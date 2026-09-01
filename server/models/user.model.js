import mongoose from "mongoose";

const cronLockSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  executedAt: {
    type: Date,
    default: Date.now,
    expires: 3600 * 4, // Auto-purges after 4 hours
  },
});

export const CronLockModel = mongoose.model('CronLock', cronLockSchema);

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
        // Not required — OTP-based accounts (see otp.controller.js) are
        // created without a password by design. loginController already
        // handles the passwordless case and tells the user to log in via OTP.
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
        enum : ['SUPER_ADMIN', 'ADMIN', 'USER', 'RIDER', 'rider', 'SELLER', 'RESTO_SELLER'],
        default : "USER"
    },
    store_name : {
        type : String,
        default : null
    },
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
    referralBonusCredited: {
        type: Boolean,
        default: false
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
    fcmTokens: {
        type: [String],
        default: []
    },
    isSnapitPlusMember: {
        type: Boolean,
        default: false
    },
    snapitPlusExpiresAt: {
        type: Date,
        default: null
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
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    isCodBlocked: {
        type: Boolean,
        default: false
    },
    codBlockedReason: {
        type: String,
        default: ""
    }
},{
    timestamps : true
})

const UserModel = mongoose.model("User", userSchema)
export default UserModel;
