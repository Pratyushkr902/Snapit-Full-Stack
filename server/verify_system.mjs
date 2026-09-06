import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function verifyAll() {
  console.log('🧪 Starting Snapit Comprehensive System Verification...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${title} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title} ${details ? `(${details})` : ''}`);
      failed++;
    }
  };

  try {
    assert(Boolean(process.env.MONGODB_URI), 'MongoDB URI Defined');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    assert(mongoose.connection.readyState === 1, 'MongoDB Connected');

    const { default: UserModel } = await import('./models/user.model.js');
    const { default: OrderModel } = await import('./models/order.model.js');
    const { default: ProductModel } = await import('./models/product.model.js');
    const { default: RestaurantModel } = await import('./models/restaurant.model.js');
    const { default: CategoryModel } = await import('./models/category.model.js');

    const userCount = await UserModel.countDocuments();
    const orderCount = await OrderModel.countDocuments();
    const prodCount = await ProductModel.countDocuments();
    const restoCount = await RestaurantModel.countDocuments();
    const catCount = await CategoryModel.countDocuments();

    assert(userCount > 0, 'Users Collection Active', `${userCount} users`);
    assert(orderCount > 0, 'Orders Collection Active', `${orderCount} orders`);
    assert(prodCount > 0, 'Products Collection Active', `${prodCount} products`);
    assert(restoCount > 0, 'Restaurants Collection Active', `${restoCount} restaurants`);
    assert(catCount > 0, 'Categories Collection Active', `${catCount} categories`);

    const admins = await UserModel.find({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } }).select('name email role');
    const riders = await UserModel.find({ role: 'RIDER' }).select('name mobile role');
    const sellers = await UserModel.find({ role: { $in: ['SELLER', 'RESTO_SELLER'] } }).select('name store_name role');

    assert(admins.length > 0, 'Admins Configured', `${admins.length} admins`);
    assert(riders.length > 0, 'Riders Fleet Configured', `${riders.length} riders`);
    assert(sellers.length > 0, 'Sellers Configured', `${sellers.length} sellers`);

    console.log(`\n🎉 Verification Finished: ${passed} passed, ${failed} failed.\n`);
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Verification error:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

verifyAll();
