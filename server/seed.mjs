import { MongoClient, ObjectId } from 'mongodb';

const uri = 'REDACTED_MONGO_URI'; // ← paste your URI here

const client = new MongoClient(uri);

// ─────────────────────────────────────────────
// 1. SATISH CHOWMEIN CENTER — fix broken prices
// restaurantId: 6a34203c995b866a201bd7a1
// ─────────────────────────────────────────────

const satishRestaurantId = new ObjectId('6a34203c995b866a201bd7a1');

// Map item name → correct flat price(s)
// For half/full items we store price as a number on the existing doc.
// Since the schema uses a single `price` field (like Dom's), we'll use Full price
// and store Half as a separate doc (matching how the DB already has them split).
const satishPriceFixes = [
  { name: 'Chowmin (Full)',              price: 60  },
  { name: 'Chowmin (Half)',              price: 30  },
  { name: 'Chowmin Fry Manchurian (Full)', price: 100 },
  { name: 'Chowmin Fry Manchurian (Half)', price: 60  },
  { name: 'Mix Chowmin (Full)',          price: 160 },
  { name: 'Mix Chowmin (Half)',          price: 80  },
  { name: 'Fry Chowmin (Full)',          price: 80  },
  { name: 'Fry Chowmin (Half)',          price: 50  },
  { name: 'Paneer Chowmin (Full)',       price: 130 },
  { name: 'Paneer Chowmin (Half)',       price: 80  },
  { name: 'Egg Chowmin (Full)',          price: 100 },
  { name: 'Egg Chowmin (Half)',          price: 50  },
  { name: 'Chicken Chowmin (Full)',      price: 140 },
  { name: 'Chicken Chowmin (Half)',      price: 80  },
  { name: 'Manchurian (Full)',           price: 80  },
  { name: 'Manchurian (Half)',           price: 40  },
  { name: 'Fry Manchurian (Full)',       price: 130 },
  { name: 'Fry Manchurian (Half)',       price: 50  },
  { name: 'Paneer Chilli (Full)',        price: 160 },
  { name: 'Paneer Chilli (Half)',        price: 80  },
  { name: 'Paneer Roll',                price: 50  },
  { name: 'Egg Roll (2 Anda)',           price: 40  },
  { name: 'Chicken Chilli (Full)',       price: 80  },
  { name: 'Chicken Chilli (Half)',       price: 40  },
  { name: 'Chicken Bone Fry (Full)',     price: 120 },
  { name: 'Chicken Bone Fry (Half)',     price: 70  },
  { name: 'Chicken Boneless (Full)',     price: 140 },
  { name: 'Chicken Boneless (Half)',     price: 80  },
  { name: 'Laccha Paratha',             price: 20  },
];

// ─────────────────────────────────────────────
// 2. SHREE RAM SHOP — brand new restaurant
// ─────────────────────────────────────────────

const shreeRamMenuItems = [
  // Snacks
  { name: 'Samosa',      price: 15, category: 'Snacks', note: 'per piece' },
  { name: 'Samosa Pair', price: 25, category: 'Snacks', note: 'pair'      },
  { name: 'Litti',       price: 15, category: 'Snacks', note: 'per piece' },
  { name: 'Litti Pair',  price: 25, category: 'Snacks', note: 'pair'      },

  // Chaat
  { name: 'Chaat (Half)', price: 30, category: 'Chaat' },
  { name: 'Chaat (Full)', price: 45, category: 'Chaat' },
];

const shreeRamMenuCategories = ['Snacks', 'Chaat'];

const shreeRamRestaurant = {
  name:             'Shree Ram Shop',
  cuisine:          'Street Food',
  area:             'Paliganj',
  rating:           4.0,
  deliveryTime:     '15-25 min',
  deliveryTimeMin:  15,
  deliveryTimeMax:  25,
  image:            'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop',
  isOpen:           true,
  isActive:         true,
  isPureVeg:        true,
  menuItems:        shreeRamMenuItems,
  menuCategories:   shreeRamMenuCategories,
  deliveryFee:      12,
  minOrderValue:    15,
  description:      'Classic street snacks — samosa, litti & chaat in Paliganj',
  offers:           [],
  cuisineTypes:     ['Street Food', 'Chaat', 'Snacks'],
  totalRatings:     0,
  createdAt:        new Date(),
  updatedAt:        new Date(),
};

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  await client.connect();
  console.log('✅ Connected to MongoDB');

  const db         = client.db('snapit');
  const menuColl   = db.collection('menuitems');
  const restColl   = db.collection('restaurants');

  // ── Fix Satish prices ──
  console.log('\n📦 Fixing Satish Chowmein Center menu item prices...');
  let fixed = 0;
  let notFound = [];

  for (const fix of satishPriceFixes) {
    const result = await menuColl.updateOne(
      {
        restaurantId: satishRestaurantId,
        name: fix.name,
      },
      {
        $set: {
          price:       fix.price,
          updatedAt:   new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      notFound.push(fix.name);
    } else {
      fixed++;
    }
  }

  console.log(`   ✔ Fixed: ${fixed} items`);
  if (notFound.length) {
    console.log(`   ⚠ Not found in DB (check names): \n     ${notFound.join('\n     ')}`);
  }

  // ── Insert Shree Ram Shop ──
  console.log('\n🏪 Inserting Shree Ram Shop...');
  const restResult = await restColl.insertOne(shreeRamRestaurant);
  const shreeRamId = restResult.insertedId;
  console.log(`   ✔ Restaurant inserted with ID: ${shreeRamId}`);

  // Insert menu items into menuitems collection
  const menuDocs = shreeRamMenuItems.map((item, i) => ({
    restaurantId:    shreeRamId,
    name:            item.name,
    price:           item.price,
    discountedPrice: 0,
    category:        item.category,
    isVeg:           true,
    isAvailable:     true,
    isBestseller:    false,
    image:           '',
    customizations:  [],
    sortOrder:       i + 1,
    createdAt:       new Date(),
    updatedAt:       new Date(),
  }));

  const menuResult = await menuColl.insertMany(menuDocs);
  console.log(`   ✔ ${menuResult.insertedCount} menu items inserted for Shree Ram Shop`);

  console.log('\n🎉 All done!');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
