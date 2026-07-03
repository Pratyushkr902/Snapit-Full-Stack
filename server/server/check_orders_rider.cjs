require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Users = mongoose.connection.collection('users');
  const Orders = mongoose.connection.collection('orders');

  const nitish = await Users.findOne({ email: 'nitishraj24568@gmail.com' });
  console.log('Nitish _id:', nitish?._id?.toString());

  const recentOrders = await Orders.find({}).sort({ createdAt: -1 }).limit(10).toArray();
  console.log(`\nLast ${recentOrders.length} orders:`);
  recentOrders.forEach(o => {
    console.log(`  orderId=${o.orderId}  delivery_status=${o.delivery_status}  riderId=${o.riderId}  rider_name="${o.rider_name}"  createdAt=${o.createdAt}`);
  });

  const matchCount = await Orders.countDocuments({ riderId: nitish?._id });
  const nullCount  = await Orders.countDocuments({ riderId: null });
  const totalCount = await Orders.countDocuments({});
  console.log(`\nTotal orders: ${totalCount}`);
  console.log(`Orders with riderId === Nitish: ${matchCount}`);
  console.log(`Orders with riderId === null: ${nullCount}`);

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
