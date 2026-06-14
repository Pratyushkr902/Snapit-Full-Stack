import { MongoClient, ObjectId } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const GROCERY  = new ObjectId('6a2c30d5159ffb6c46268d92');
const PHARMACY = new ObjectId('6a2c30d5159ffb6c46268d93');
const IDS      = [GROCERY, PHARMACY];

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('snapit');

  // Remove from products
  const p = await db.collection('products').updateMany(
    { category: { $in: IDS } },
    { $pull: { category: { $in: IDS } } }
  );
  console.log('Products updated: ' + p.modifiedCount);

  // Remove from subcategories
  const s = await db.collection('subcategories').updateMany(
    { category: { $in: IDS } },
    { $pull: { category: { $in: IDS } } }
  );
  console.log('Subcategories updated: ' + s.modifiedCount);

  // Delete the categories
  const d = await db.collection('categories').deleteMany({ _id: { $in: IDS } });
  console.log('Categories deleted: ' + d.deletedCount);

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
