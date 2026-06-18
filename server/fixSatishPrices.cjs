require('dotenv').config();
const mongoose = require('mongoose');

const RESTAURANT_ID = '6a34203c995b866a201bd7a1';

// Flat price fixes — full price as the main price
const priceFixes = [
  { name: 'Chowmin',                price: 60  },
  { name: 'Chowmin Fry Manchurian', price: 100 },
  { name: 'Mix Chowmin',            price: 160 },
  { name: 'Fry Chowmin',            price: 80  },
  { name: 'Paneer Chowmin',         price: 130 },
  { name: 'Egg Chowmin',            price: 100 },
  { name: 'Chicken Chowmin',        price: 140 },
  { name: 'Manchurian',             price: 80  },
  { name: 'Fry Manchurian',         price: 130 },
  { name: 'Paneer Chilli',          price: 160 },
  { name: 'Paneer Roll',            price: 50  },
  { name: 'Egg Roll (2 Anda)',      price: 40  },
  { name: 'Chicken Chilli',         price: 80  },
  { name: 'Chicken Bone Fry',       price: 120 },
  { name: 'Chicken Boneless',       price: 140 },
  { name: 'Laccha Paratha',         price: 20  },
];

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const col = mongoose.connection.collection('menuitems');
  const rid = new mongoose.Types.ObjectId(RESTAURANT_ID);

  let fixed = 0;
  for (const item of priceFixes) {
    const result = await col.updateOne(
      { restaurantId: rid, name: item.name },
      { $set: { price: item.price, updatedAt: new Date() } }
    );
    if (result.matchedCount) fixed++;
    else console.log('Not found:', item.name);
  }

  console.log(`Fixed ${fixed} items`);
  await mongoose.disconnect();
  console.log('Done');
}

fix().catch(e => { console.error(e); process.exit(1); });
