import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    address_line : {
        type : String,
        default : ""
    },
    city : {
        type : String,
        default : ""
    },
    state : {
        type : String,
        default : ""
    },
    pincode : {
        type : String
    },
    country : {
        type : String
    },
    mobile : {
        type : Number,
        default : null
    },
    recipient_name : {
        type : String,
        default : ""
    },
    recipient_mobile : {
        type : String,
        default : ""
    },
    address_type : {
        type : String,
        enum : ['HOME', 'WORK', 'FRIENDS_FAMILY', 'OTHER'],
        default : 'HOME'
    },
    landmark : {
        type : String,
        default : ""
    },
    floor_door : {
        type : String,
        default : ""
    },
    delivery_instructions : {
        type : String,
        default : ""
    },
    status : {
        type : Boolean,
        default : true
    },
    userId : {
        type : mongoose.Schema.ObjectId,
        default : ""
    },
    lat : {
        type : Number,
        default : null
    },
    lng : {
        type : Number,
        default : null
    },
},{
    timestamps : true
})

const AddressModel = mongoose.model('address', addressSchema)
export default AddressModel