import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId : {
        type : mongoose.Schema.ObjectId,
        ref : 'User'
    },
    orderId : {
        type : String,
        required : [true, "Provide orderId"],
        unique : true
    },
    productId : {
        type : mongoose.Schema.ObjectId,
        ref : "product"
    },
    cartItems: [{
        productId:  { type: mongoose.Schema.ObjectId, ref: "product" },
        quantity:   { type: Number, default: 1 },
        name:       String,
        image:      String,
        price:      Number,
        seller_store_name: { type: String, default: null }
    }],
    product_details : {
        name : String,
        image : Array,
    },
    paymentId : {
        type : String,
        default : ""
    },
    payment_status : {
        type : String,
        default : ""
    },
    delivery_address : {
        type : mongoose.Schema.ObjectId,
        ref : 'address'
    },
    subTotalAmt : {
        type : Number,
        default : 0
    },
    totalAmt : {
        type : Number,
        default : 0
    },
    invoice_receipt : {
        type : String,
        default : ""
    },
    seller_status: {
        type: String,
        enum: ["Pending", "Packing", "Ready for Pickup"],
        default: "Pending"
    },
    store_details: {
        storeId:  { type: mongoose.Schema.ObjectId, ref: 'store' },
        name:     { type: String, default: "Snapit Main Store - Paliganj" },
        address:  { type: String, default: "Main Road, Paliganj" },
        location: {
            lat: { type: Number, default: 25.2921 },
            lng: { type: Number, default: 84.8170 }
        }
    },
    involved_stores: [{ type: String }],
    delivery_status : {
        type : String,
        enum : ["Pending", "Confirmed", "Out for Delivery", "Delivered", "Cancelled"],
        default : "Pending"
    },
    rider_name : {
        type : String,
        default : "Pratyush Kumar"
    },
    rider_contact : {
        type : String,
        default : "9472026580"
    },
    payment_collected: {
        type: Boolean,
        default: false
    },
    payment_mode: {
        type: String,
        default: null
    },
    cashReceived: {
        type: Number,
        default: 0
    },
    isSettled: {
        type: Boolean,
        default: false
    },
    settledAt: {
        type: Date
    },
    deliveredAt: {
        type: Date
    },
    // ✅ PROMO & SCRATCH CARD FIELDS
    coupon_used: {
        type: String,
        default: null
    },
    discount_amount: {
        type: Number,
        default: 0
    },
    scratch_cards: {
        type: Array,
        default: []
    }
},{
    timestamps : true
})

const OrderModel = mongoose.model('order', orderSchema)
export default OrderModel