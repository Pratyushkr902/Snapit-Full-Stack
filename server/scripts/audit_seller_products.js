// audit_seller_products.js
// Read-only audit: shows which seller(s) each product belongs to via store_inventory,
// and flags products that are shared across multiple sellers.
//
// Usage:
//   cd ~/Snapit-Full-Stack/server
//   node scripts/audit_seller_products.js
//
// Requires MONGODB_URI in your .env (same one your server already uses).

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI;

if (!MONGO_URI) {
    console.error('❌ No MONGODB_URI / MONGO_URI / DB_URI found in .env. Set one of these and re-run.');
    process.exit(1);
}

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Sanity-check collection names — adjust here if your collections are named differently.
    const collections = (await db.listCollections().toArray()).map(c => c.name);
    const productColl = collections.includes('products') ? 'products'
        : collections.find(c => /product/i.test(c));
    const userColl = collections.includes('users') ? 'users'
        : collections.find(c => /user/i.test(c));

    if (!productColl || !userColl) {
        console.error('❌ Could not find product/user collections. Found collections:', collections);
        process.exit(1);
    }
    console.log(`Using collections: products="${productColl}", users="${userColl}"\n`);

    const products = await db.collection(productColl)
        .find({}, { projection: { name: 1, store_inventory: 1, publish: 1 } })
        .toArray();

    const sellers = await db.collection(userColl)
        .find({ role: 'SELLER' }, { projection: { name: 1, email: 1, store_name: 1 } })
        .toArray();

    const sellerById = {};
    sellers.forEach(s => { sellerById[s._id.toString()] = s; });

    // ── Group products by store_name ──
    const byStore = {};      // store_name -> [product]
    const sharedProducts = []; // products with 2+ store_inventory entries
    const orphanProducts = []; // products with no store_inventory / no sellerId

    for (const p of products) {
        const inv = p.store_inventory || [];
        if (inv.length === 0) {
            orphanProducts.push(p);
            continue;
        }
        if (inv.length > 1) sharedProducts.push(p);

        for (const entry of inv) {
            const storeName = entry.store_name || '(unknown store)';
            if (!byStore[storeName]) byStore[storeName] = [];
            byStore[storeName].push({
                name: p.name,
                productId: p._id.toString(),
                stock: entry.stock,
                isAvailable: entry.isAvailable,
                sellerId: entry.sellerId ? entry.sellerId.toString() : null,
                publish: p.publish,
            });
        }
    }

    // ── Print per-seller breakdown ──
    console.log('═══════════════════════════════════════');
    console.log('  PRODUCTS BY STORE');
    console.log('═══════════════════════════════════════\n');

    for (const [storeName, items] of Object.entries(byStore)) {
        // try to resolve a seller for this store_name (best-effort — a store can map to one seller)
        const matchedSeller = sellers.find(s => s.store_name === storeName);
        console.log(`📦 ${storeName}${matchedSeller ? `  (${matchedSeller.email})` : '  ⚠️ no matching seller account found'}`);
        items.forEach(it => {
            const sellerMatch = it.sellerId && sellerById[it.sellerId];
            const sellerIdFlag = it.sellerId
                ? (sellerMatch ? '' : '  ⚠️ sellerId does not match any SELLER user')
                : '  ⚠️ sellerId missing on this inventory entry';
            console.log(`   - ${it.name}  [stock:${it.stock}, available:${it.isAvailable}, publish:${it.publish}]${sellerIdFlag}`);
        });
        console.log(`   Total: ${items.length} product(s)\n`);
    }

    // ── Sellers with zero products ──
    const storesWithProducts = new Set(Object.keys(byStore));
    const sellersWithNoProducts = sellers.filter(s => s.store_name && !storesWithProducts.has(s.store_name));
    if (sellersWithNoProducts.length > 0) {
        console.log('═══════════════════════════════════════');
        console.log('  SELLERS WITH NO PRODUCTS');
        console.log('═══════════════════════════════════════');
        sellersWithNoProducts.forEach(s => console.log(`   - ${s.store_name} (${s.email})`));
        console.log('');
    }

    // ── Shared products (belong to 2+ sellers) ──
    if (sharedProducts.length > 0) {
        console.log('═══════════════════════════════════════');
        console.log(`  ⚠️  SHARED PRODUCTS (${sharedProducts.length}) — listed under 2+ stores`);
        console.log('═══════════════════════════════════════');
        sharedProducts.forEach(p => {
            const stores = (p.store_inventory || []).map(i => i.store_name).join(', ');
            console.log(`   - ${p.name}  (id: ${p._id})  →  stores: ${stores}`);
        });
        console.log('');
    }

    // ── Orphan products (no store_inventory at all) ──
    if (orphanProducts.length > 0) {
        console.log('═══════════════════════════════════════');
        console.log(`  ⚠️  ORPHAN PRODUCTS (${orphanProducts.length}) — no store_inventory, invisible to all sellers`);
        console.log('═══════════════════════════════════════');
        orphanProducts.forEach(p => console.log(`   - ${p.name}  (id: ${p._id})`));
        console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log(`  SUMMARY: ${products.length} total products, ${sellers.length} sellers, ${sharedProducts.length} shared, ${orphanProducts.length} orphaned`);
    console.log('═══════════════════════════════════════');

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
