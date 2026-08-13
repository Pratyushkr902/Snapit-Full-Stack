/**
 * replaceCloudinaryWithR2.js
 *
 * Scans all products in MongoDB and replaces any Cloudinary image URLs
 * with their R2 equivalents, using the existing migration map files:
 *   - new-cloudinary-map.json
 *   - migration-url-map.json
 *   - missing-url-map.json
 *
 * Usage:
 *   node replaceCloudinaryWithR2.js --dry-run     # preview only, no writes
 *   node replaceCloudinaryWithR2.js                # actually apply changes
 *
 * Run this from inside your `server/` folder (same place the *-map.json
 * files and your .env live).
 */

import dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');

// ─── LOAD + MERGE ALL MAP FILES ────────────────────────────────────────────
const MAP_FILES = [
    'new-cloudinary-map.json',
    'migration-url-map.json',
    'missing-url-map.json',
];

function normalize(url) {
    // Treat http/https versions of the same Cloudinary URL as identical keys
    return url.trim();
}

const urlMap = new Map();

for (const file of MAP_FILES) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log(`[skip] ${file} not found, skipping`);
        continue;
    }
    try {
        const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        let count = 0;
        for (const [cloudinaryUrl, r2Url] of Object.entries(json)) {
            if (typeof r2Url === 'string' && r2Url.startsWith('http')) {
                urlMap.set(normalize(cloudinaryUrl), r2Url);
                count++;
            }
        }
        console.log(`[loaded] ${file} → ${count} mappings`);
    } catch (err) {
        console.warn(`[warn] Failed to parse ${file}: ${err.message}`);
    }
}

console.log(`\nTotal unique Cloudinary → R2 mappings loaded: ${urlMap.size}\n`);

if (urlMap.size === 0) {
    console.error('No mappings found in any map file. Nothing to do. Exiting.');
    process.exit(1);
}

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in .env');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    const db = client.db('snapit');
    const productsCollection = db.collection('products');

    const products = await productsCollection.find({ image: { $exists: true, $ne: [] } }).toArray();
    console.log(`Scanning ${products.length} products...\n`);

    let productsChanged = 0;
    let urlsReplaced = 0;
    const unmatchedCloudinaryUrls = new Set();

    for (const product of products) {
        if (!Array.isArray(product.image)) continue;

        let changed = false;
        const newImages = product.image.map((url) => {
            if (typeof url !== 'string' || !url.includes('cloudinary.com')) {
                return url; // not a Cloudinary URL, leave as-is
            }

            const replacement = urlMap.get(normalize(url));
            if (replacement) {
                changed = true;
                urlsReplaced++;
                return replacement;
            }

            // Cloudinary URL with no known R2 replacement — flag it
            unmatchedCloudinaryUrls.add(url);
            return url;
        });

        if (changed) {
            productsChanged++;
            console.log(`${DRY_RUN ? '[DRY RUN] would update' : '[updating]'} "${product.name}" (${product._id})`);

            if (!DRY_RUN) {
                const result = await productsCollection.updateOne(
                    { _id: product._id },
                    { $set: { image: newImages } }
                );
                if (result.modifiedCount !== 1) {
                    console.warn(`  ⚠️  modifiedCount was ${result.modifiedCount} — write may not have persisted!`);
                }
            }
        }
    }

    console.log('\n──────────────── SUMMARY ────────────────');
    console.log(`Products scanned:        ${products.length}`);
    console.log(`Products ${DRY_RUN ? 'that would be' : ''} updated: ${productsChanged}`);
    console.log(`Image URLs ${DRY_RUN ? 'that would be' : ''} replaced:  ${urlsReplaced}`);
    console.log(`Cloudinary URLs with NO R2 match: ${unmatchedCloudinaryUrls.size}`);

    if (unmatchedCloudinaryUrls.size > 0) {
        console.log('\n⚠️  These Cloudinary URLs have no R2 replacement in your map files:');
        for (const url of unmatchedCloudinaryUrls) {
            console.log('  -', url);
        }
        console.log('\nThese were left unchanged. You may need to re-upload these images to R2 separately.');
    }

    if (DRY_RUN) {
        console.log('\nThis was a DRY RUN — no changes were saved.');
        console.log('Run again without --dry-run to apply these changes.');
    } else {
        console.log('\n✅ Changes saved to MongoDB.');
    }

    await client.close();
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});