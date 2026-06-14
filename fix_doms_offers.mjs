import { MongoClient } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const col = client.db('snapit').collection('restaurants');
  await col.updateOne(
    { name: "Dom's Biryani" },
    { $set: { offers: ['20% OFF on first order'] } }
  );
  console.log('✅ Fixed');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
