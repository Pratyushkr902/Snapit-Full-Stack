import { MongoClient } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const fixes = {
  'Fresh Brinjal (Baingan)':      'https://images.unsplash.com/photo-1659261200833-ec8761558af7?w=400',
  'Fresh Bitter Gourd (Karela)':  'https://images.unsplash.com/photo-1621955511258-5b2e2b8f8a1a?w=400',
};

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const col = client.db('snapit').collection('products');
  for (const [name, url] of Object.entries(fixes)) {
    const result = await col.updateOne(
      { name, 'store_inventory.store_name': 'Fresh Fruits Shop' },
      { $set: { image: [url], updatedAt: new Date() } }
    );
    console.log(name + ': ' + (result.modifiedCount > 0 ? 'Updated' : 'Not found'));
  }
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
