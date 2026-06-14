import { MongoClient, ObjectId } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('snapit');

  // Get Dom's Biryani
const resto = await db.collection('restaurants').findOne({ name: "Alka" });  if (!resto) { console.log('Not found'); return; }

  console.log('Restaurant ID:', resto._id);
  console.log('Embedded menu items:', resto.menuItems?.length || 0);

  // Build menuitems docs from embedded menuItems array
  const docs = (resto.menuItems || []).map(item => ({
    _id:          new ObjectId(),
    restaurantId: String(resto._id),
    name:         item.name,
    price:        item.price,
    category:     item.category,
    isAvailable:  true,
    isVeg:        false,
    isBestseller: false,
    sortOrder:    0,
    createdAt:    new Date(),
    updatedAt:    new Date(),
  }));

  if (docs.length === 0) { console.log('No embedded menu items to migrate'); return; }

  // Insert into menuitems collection
  const result = await db.collection('menuitems').insertMany(docs);
  console.log('✅ Migrated ' + result.insertedCount + ' items into menuitems collection');

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
