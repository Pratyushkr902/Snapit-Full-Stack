import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI not set');

const client = new MongoClient(uri);

// Shree Ram Shop restaurant ID (inserted earlier)
const shreeRamId = new ObjectId('6a343566a9b1f31e3ba04832');

// Helper: create per-piece, half-kg, full-kg variants
// perPiece: price per piece
// kgPrice: price per kg (half = kgPrice/2)
function variants(name, category, perPiece, kgPrice, isVeg = true) {
  const items = [];
  if (perPiece) {
    items.push({ name: `${name} (Per Piece)`, price: perPiece, category, isVeg });
  }
  if (kgPrice) {
    items.push({ name: `${name} (Half Kg)`,  price: Math.round(kgPrice / 2), category, isVeg });
    items.push({ name: `${name} (Full Kg)`,  price: kgPrice, category, isVeg });
  }
  return items;
}

const sweetItems = [
  // Chenna Sweets
  ...variants('Raskadum',         'Chenna Sweets', 25,   550),
  ...variants('Kalakand',         'Chenna Sweets', 20,   550),
  ...variants('Khir Kadam',       'Chenna Sweets', 20,   500),
  ...variants('Khoa Roll',        'Chenna Sweets', 20,   480),
  ...variants('Creme Chalk',      'Chenna Sweets', 25,   300),
  ...variants('Kala Cream Chalk', 'Chenna Sweets', 25,   300),
  ...variants('Chenna Roll',      'Chenna Sweets', 40,   500),
  ...variants('Malai Toast',      'Chenna Sweets', 50,   500),
  ...variants('Malai Chamcham',   'Chenna Sweets', 50,   500),
  ...variants('Chhena',           'Chenna Sweets', 15,   260),
  ...variants('Rasbhari',         'Chenna Sweets', 20,   280),
  { name: 'Rajbhog (Per Piece)',          price: 25,  category: 'Chenna Sweets', isVeg: true },
  { name: 'Rasmalai (Cup / 2 Pieces)',    price: 45,  category: 'Chenna Sweets', isVeg: true },
  { name: 'Chenna Piece (Cup)',           price: 50,  category: 'Chenna Sweets', isVeg: true },
  ...variants('Guur Rasgulla',    'Chenna Sweets', 25,   360),

  // Barfi & Laddu
  ...variants('Kaju Barfi',       'Barfi & Laddu', 15,  1000),
  ...variants('Barfi / Pera',     'Barfi & Laddu', 15,   360),
  ...variants('Batisha',          'Barfi & Laddu', 15,   400),
  ...variants('Milk Cake',        'Barfi & Laddu', 20,   400),
  ...variants('Besan Laddu',      'Barfi & Laddu', 10,   200),
  ...variants('Motichoor Laddu',  'Barfi & Laddu', 8,    180),

  // Kalajamun & Rasgulla
  { name: 'Kalajamun Large (Per Piece)',  price: 25,  category: 'Kalajamun & Rasgulla', isVeg: true },
  { name: 'Kalajamun Small (Per Piece)',  price: 15,  category: 'Kalajamun & Rasgulla', isVeg: true },
  { name: 'Kalajamun (Half Kg)',          price: 140, category: 'Kalajamun & Rasgulla', isVeg: true },
  { name: 'Kalajamun (Full Kg)',          price: 280, category: 'Kalajamun & Rasgulla', isVeg: true },
  ...variants('Rasgulla / Layi',          'Kalajamun & Rasgulla', 15, 280),
  ...variants('Special Layi',             'Kalajamun & Rasgulla', 20, 400),

  // Drinks
  { name: 'Lassi', price: 40, category: 'Drinks', isVeg: true },
];

const newCategories = ['Chenna Sweets', 'Barfi & Laddu', 'Kalajamun & Rasgulla', 'Drinks'];

async function main() {
  await client.connect();
  console.log('Connected to MongoDB');

  const db       = client.db('snapit');
  const menuColl = db.collection('menuitems');
  const restColl = db.collection('restaurants');

  // Insert menu items
  const docs = sweetItems.map((item, i) => ({
    restaurantId:    shreeRamId,
    name:            item.name,
    price:           item.price,
    discountedPrice: 0,
    category:        item.category,
    isVeg:           item.isVeg,
    isAvailable:     true,
    isBestseller:    false,
    image:           '',
    customizations:  [],
    sortOrder:       100 + i, // offset so they come after existing items
    createdAt:       new Date(),
    updatedAt:       new Date(),
  }));

  const menuResult = await menuColl.insertMany(docs);
  console.log(`Inserted ${menuResult.insertedCount} sweet/drink items`);

  // Also update restaurant's menuCategories to include new ones
  await restColl.updateOne(
    { _id: shreeRamId },
    {
      $addToSet: { menuCategories: { $each: newCategories } },
      $set: { updatedAt: new Date() }
    }
  );
  console.log('Updated Shree Ram Shop menuCategories');

  console.log('\nAll done!');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });