import mongoose from "mongoose";
import OrderModel from "../models/order.model.js";
import dotenv from "dotenv";

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const orders = await OrderModel.find({ 
  delivery_status: "Delivered",
  $or: [{ delivery_fee: 0 }, { delivery_fee: null }]
});

console.log(`Found ${orders.length} orders to fix...`);

for (const order of orders) {
  const fee = Number(order.totalAmt) >= 399 ? 0 : 12;
  await OrderModel.updateOne({ _id: order._id }, { delivery_fee: fee });
  console.log(`Fixed: ${order.orderId} → ₹${fee}`);
}

console.log(`Done.`);
await mongoose.disconnect();
