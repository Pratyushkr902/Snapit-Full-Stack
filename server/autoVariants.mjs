import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://00pr1199_db_user:vBwz9MdbZlvkLAgo@snapit.na1dsaj.mongodb.net/snapit";
const client = new MongoClient(uri);

function toSlug(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

function getBaseName(name) {
  // Remove common size patterns from end of name
  return name
    .replace(/\s*[\(\[].*?[\)\]]/g, '')     // remove (bracketed) text
    .replace(/\s*-\s*pack of \d+/gi, '')     // remove "- pack of 3"
    .replace(/\s*\d+\s*(kg|gm|g|ml|l|ltr|litre|pc|pcs|pieces?)\s*$/gi, '') // remove trailing size
    .replace(/\s*x\s*\d+/gi, '')             // remove "x 3"
    .trim();
}

async function run() {
  await client.connect();
  const db = client.db('snapit');
  const products = await db.collection('products').find({}, { projection: { name: 1, unit: 1, variantGroup: 1 } }).toArray();

  // Group by base name
  const groups = {};
  for (const p of products) {
    const base = getBaseName(p.name);
    const slug = toSlug(base);
    if (!groups[slug]) groups[slug] = [];
    groups[slug].push({ _id: p._id, name: p.name, unit: p.unit });
  }

  // Only update groups with 2+ products (real variants)
  let updated = 0;
  for (const [slug, items] of Object.entries(groups)) {
    if (items.length < 2) continue;
    console.log(`\n✅ Group: "${slug}" (${items.length} variants)`);
    items.forEach(i => console.log(`   - ${i.name} [${i.unit}]`));
    const ids = items.map(i => i._id);
    await db.collection('products').updateMany(
      { _id: { $in: ids }, variantGroup: '' },
      { $set: { variantGroup: slug } }
    );
    updated += items.length;
  }

  console.log(`\n🎉 Done! ${updated} products updated with variantGroup.`);
  await client.close();
}

run().catch(console.error);
