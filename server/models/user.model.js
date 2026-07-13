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
        enum : ['ADMIN', 'USER', 'RIDER', 'rider', 'SELLER', 'RESTO_SELLER', 'CAMPUS_AMBASSADOR'],
        default : "USER"
    },
    // Set only when role === 'CAMPUS_AMBASSADOR'. ambassadorId and referralCode
    // are auto-generated in the pre('save') hook below — never set them manually.
    campusAmbassador : {
        ambassadorId : { type : String, unique : true, sparse : true },
        status       : { type : String, enum : ['active', 'inactive', 'pending'], default : 'pending' },
        college      : { type : String, default : "" },
        course       : { type : String, default : "" },
        year         : { type : String, default : "" },
        campus       : { type : String, default : "" },
        joinedAt     : { type : Date, default : null },

        referralCode : { type : String, unique : true, sparse : true },
        referralStats : {
            appDownloads    : { type : Number, default : 0 },
            signUps         : { type : Number, default : 0 },
            firstOrders     : { type : Number, default : 0 },
            completedOrders : { type : Number, default : 0 },
            totalOrders     : { type : Number, default : 0 }
        },

        performance : {
            points             : { type : Number, default : 0 },
            certificateEligible: { type : Boolean, default : false },
            lorEligible         : { type : Boolean, default : false }
        },

        social : {
            instagram : { type : String, default : "" }
        },

        notes : { type : String, default : "" }
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
    // Set once at signup if a valid Campus Ambassador referralCode was submitted.
    // Separate from referredBy (general referral system) — used to attribute
    // order activity back to the ambassador via the OrderModel hook.
    referredByAmbassador: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
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
        // Each entry: { code: 'SNAPIT', usedAt: <Date> } — one use per calendar month per code
        type: [{
            code: { type: String },
            usedAt: { type: Date }
        }],
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

// ── Auto-generate ambassadorId + referralCode for new Campus Ambassadors ──
// Only runs once, on creation, when role is CAMPUS_AMBASSADOR and these
// fields haven't already been set (so re-saves / edits don't overwrite them).
// Note: campusAmbassador.referralCode is intentionally separate from the
// top-level referralCode field (used for general invite-a-friend bonuses) —
// keeps CA performance tracking independent of the general referral system.
userSchema.pre('save', async function () {
    if (this.role !== 'CAMPUS_AMBASSADOR' || !this.isNew) return

    if (!this.campusAmbassador) this.campusAmbassador = {}

    if (!this.campusAmbassador.ambassadorId) {
        const collegeInitials = (this.campusAmbassador.college || 'GEN')
            .split(/\s+/)
            .filter(w => /^[a-zA-Z]/.test(w))
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 4) || 'GEN'

        const existingCount = await this.constructor.countDocuments({
            role: 'CAMPUS_AMBASSADOR',
            'campusAmbassador.college': this.campusAmbassador.college
        })

        const seq = String(existingCount + 1).padStart(3, '0')
        this.campusAmbassador.ambassadorId = `CA-${collegeInitials}-${seq}`
    }

    if (!this.campusAmbassador.referralCode) {
        const namePart = (this.name || 'SNAPIT')
            .replace(/[^a-zA-Z]/g, '')
            .toUpperCase()
            .slice(0, 6) || 'SNAPIT'
        const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
        this.campusAmbassador.referralCode = `${namePart}${randomPart}`
    }

    if (!this.campusAmbassador.joinedAt) {
        this.campusAmbassador.joinedAt = new Date()
    }

})


const UserModel = mongoose.model("User", userSchema)
export default UserModel;