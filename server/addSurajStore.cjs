require('dotenv').config();
const mongoose = require('mongoose');

const SURAJ_USER_ID = '6a33ef1ba088fc695fe67248';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const db = mongoose.connection;
  const storesColl = db.collection('stores');
  const usersColl  = db.collection('users');

  // 1. Insert store
  const store = {
    name:      'Suraj Vegetables',
    address:   'Paliganj, Bihar',
    phone:     '',
    category:  'vegetables',
    location:  {},
    isActive:  true,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v:       0,
  };

  const storeResult = await storesColl.insertOne(store);
  const storeId = storeResult.insertedId;
  console.log('✅ Store inserted:', storeId);

  // 2. Update Suraj's user → STORE_SELLER + link storeId
  await usersColl.updateOne(
    { _id: new mongoose.Types.ObjectId(SURAJ_USER_ID) },
    {
      $set: {
        role:       'SELLER',
        store_name: 'Suraj Vegetables',
        storeId:    storeId,
        updatedAt:  new Date(),
      }
    }
  );
  console.log('✅ Suraj user updated → STORE_SELLER');

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(e => { console.error(e); process.exit(1); });
