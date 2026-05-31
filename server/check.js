import connectDB from './config/connectDB.js';
import OrderModel from './models/order.model.js';

await connectDB();

const order = await OrderModel.findOne({ delivery_status: 'Delivered' }).lean();
console.log(JSON.stringify(order, null, 2));
process.exit(0);
