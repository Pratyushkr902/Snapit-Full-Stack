import { MongoClient } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const images = {
  'Fresh Banana':                  'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400',
  'Fresh Apple (Shimla)':          'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
  'Fresh Mango':                   'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400',
  'Fresh Papaya':                  'https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=400',
  'Fresh Watermelon':              'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=400',
  'Fresh Guava':                   'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=400',
  'Fresh Grapes (Green)':          'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400',
  'Fresh Lemon':                   'https://images.unsplash.com/photo-1582287014914-1db2e31b8b29?w=400',
  'Fresh Pomegranate':             'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400',
  'Fresh Pineapple':               'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400',
  'Fresh Coconut':                 'https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?w=400',
  'Fresh Orange':                  'https://images.unsplash.com/photo-1547514701-42782101795e?w=400',
  'Fresh Pear':                    'https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=400',
  'Fresh Kiwi':                    'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=400',
  'Fresh Chiku (Sapota)':          'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400',
  'Fresh Tomato':                  'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=400',
  'Fresh Potato (Aloo)':           'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400',
  'Fresh Onion (Pyaz)':            'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
  'Fresh Cauliflower':             'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400',
  'Fresh Cabbage':                 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400',
  'Fresh Carrot (Gajar)':          'https://images.unsplash.com/photo-1445282768818-728615cc910a?w=400',
  'Fresh Spinach (Palak)':         'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400',
  'Fresh Bitter Gourd (Karela)':   'https://images.unsplash.com/photo-1567608346078-f43f22c7a7ca?w=400',
  'Fresh Bottle Gourd (Lauki)':    'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400',
  'Fresh Cucumber (Kheera)':       'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400',
  'Fresh Lady Finger (Bhindi)':    'https://images.unsplash.com/photo-1601648764658-cf37e8c89b70?w=400',
  'Fresh Green Peas (Matar)':      'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400',
  'Fresh Brinjal (Baingan)':       'https://images.unsplash.com/photo-1634171899769-54c6e49c1c5a?w=400',
  'Fresh Capsicum (Shimla Mirch)': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400',
  'Fresh Garlic (Lehsun)':         'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=400',
  'Fresh Ginger (Adrak)':          'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400',
  'Fresh Green Chilli (Mirchi)':   'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400',
};

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  console.log('Connected to MongoDB');
  const col = client.db('snapit').collection('products');
  let updated = 0;
  for (const [name, url] of Object.entries(images)) {
    const result = await col.updateOne(
      { name, 'store_inventory.store_name': 'Fresh Fruits Shop' },
      { $set: { image: [url], updatedAt: new Date() } }
    );
    if (result.modifiedCount > 0) { updated++; console.log('Updated: ' + name); }
    else console.log('Not found: ' + name);
  }
  console.log('Done — ' + updated + ' products updated with images');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
