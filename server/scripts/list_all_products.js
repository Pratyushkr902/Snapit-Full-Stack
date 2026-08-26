// list_all_products.js
//
// Dumps every product's name (and a few useful fields) to a text file,
// since printing 700+ products directly to the terminal is unreadable.
//
// Usage:
//   cd ~/Snapit-Full-Stack/server
//   node scripts/list_all_products.js
//
// Output: scripts/all_products.txt

import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI;

if (!MONGO_URI) {
    console.error('❌ No MONGODB_URI / MONGO_URI / DB_URI found in .env.');
    process.exit(1);
}

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = (await db.listCollections().toArray()).map(c => c.name);
    const productColl = collections.includes('products') ? 'products' : collections.find(c => /product/i.test(c));

    const products = await db.collection(productColl)
        .find({}, { projection: { name: 1, store_inventory: 1, publish: 1, stock: 1 } })
        .sort({ name: 1 })
        .toArray();

    const lines = products.map(p => {
        const stores = (p.store_inventory || []).map(s => s.store_name).join(', ') || '(no store — orphan)';
        return `${p.name}  |  store(s): ${stores}  |  publish: ${p.publish}`;
    });

    const outPath = path.join(__dirname, 'all_products.txt');
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

    console.log(`📄 Wrote ${products.length} product names to: ${outPath}`);
    console.log(`\nOpen it with:\n  cat scripts/all_products.txt\n  # or\n  open scripts/all_products.txt   (macOS — opens in default text editor)`);

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
