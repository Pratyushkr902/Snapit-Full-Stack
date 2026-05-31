import connectDB from './config/connectDB.js';
import OrderModel from './models/order.model.js';

await connectDB();

const result = await OrderModel.updateMany(
    { delivery_status: 'Delivered', delivery_fee: { $exists: false } },
    { $set: { delivery_fee: 12 } }
);

console.log('✅ Updated:', result.modifiedCount, 'orders');
process.exit(0);
