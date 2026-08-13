/**
 * migrateRemainingCloudinaryImages.js
 *
 * For every product image URL still pointing at Cloudinary with NO existing
 * R2 replacement in your map files, this script:
 *   1. Downloads the image bytes from Cloudinary
 *   2. Uploads them to your R2 bucket (same bucket/creds as your live app)
 *   3. Records the new mapping in new-cloudinary-map.json (so future runs skip it)
 *   4. Updates the product's `image` array in MongoDB with the new R2 URL
 *
 * Usage:
 *   node migrateRemainingCloudinaryImages.js --dry-run   # just list what would happen
 *   node migrateRemainingCloudinaryImages.js              # actually migrate
 *
 * Run from inside server/ (same place as .env and the *-map.json files).
 */

import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DRY_RUN = process.argv.includes('--dry-run');

// ─── R2 CLIENT (same config as your real uploadImageClodinary.js) ─────────
const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 400) {
                return reject(new Error(`Download failed (${res.statusCode}) for ${url}`));
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({
                buffer: Buffer.concat(chunks),
                contentType: res.headers['content-type'] || 'image/jpeg',
            }));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function uploadToR2(buffer, contentType) {
    const extension = (contentType.split('/')[1] || 'jpg').split(';')[0];
    const fileName = `snapit/${randomUUID()}.${extension}`;

    await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
    }));

    return `${process.env.R2_PUBLIC_URL}/${fileName}`;
}

// ─── LOAD EXISTING MAP (so we don't redo work, and so we can append to it) ─
const MAP_FILE = path.join(__dirname, 'new-cloudinary-map.json');
let urlMap = {};
if (fs.existsSync(MAP_FILE)) {
    try {
        urlMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf-8'));
    } catch {
        console.warn('[warn] Could not parse existing new-cloudinary-map.json, starting fresh');
    }
}

// Also pull in any mappings from the other map files, read-only, for lookups
for (const file of ['migration-url-map.json', 'missing-url-map.json']) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        try {
            const extra = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            urlMap = { ...extra, ...urlMap }; // urlMap (new-cloudinary-map) takes priority
        } catch {}
    }
}

function saveMap() {
    fs.writeFileSync(MAP_FILE, JSON.stringify(urlMap, null, 2));
}

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in .env');
        process.exit(1);
    }
    if (!process.env.R2_ENDPOINT || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
        console.error('Missing R2_ENDPOINT / R2_BUCKET_NAME / R2_PUBLIC_URL in .env');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    const db = client.db('snapit');
    const productsCollection = db.collection('products');

    const products = await productsCollection.find({ image: { $exists: true, $ne: [] } }).toArray();
    console.log(`Scanning ${products.length} products...\n`);

    let productsUpdated = 0;
    let imagesMigrated = 0;
    let imagesFailed = 0;

    for (const product of products) {
        if (!Array.isArray(product.image)) continue;

        let changed = false;
        const newImages = [];

        for (const url of product.image) {
            if (typeof url !== 'string' || !url.includes('cloudinary.com')) {
                newImages.push(url);
                continue;
            }

            // Already have a mapping (from earlier pass or other map files)
            if (urlMap[url]) {
                newImages.push(urlMap[url]);
                changed = true;
                continue;
            }

            if (DRY_RUN) {
                console.log(`[DRY RUN] would migrate: ${url}`);
                newImages.push(url); // unchanged in dry run
                continue;
            }

            try {
                console.log(`[migrating] ${url}`);
                const { buffer, contentType } = await downloadImage(url);
                const r2Url = await uploadToR2(buffer, contentType);
                urlMap[url] = r2Url;
                saveMap(); // persist incrementally so a crash doesn't lose progress
                newImages.push(r2Url);
                changed = true;
                imagesMigrated++;
                console.log(`  → ${r2Url}`);
            } catch (err) {
                console.error(`  ✗ FAILED: ${err.message}`);
                newImages.push(url); // leave original URL if migration fails
                imagesFailed++;
            }
        }

        if (changed && !DRY_RUN) {
            const result = await productsCollection.updateOne(
                { _id: product._id },
                { $set: { image: newImages } }
            );
            if (result.modifiedCount === 1) {
                productsUpdated++;
                console.log(`[saved] "${product.name}" (${product._id})\n`);
            } else {
                console.warn(`[NOT SAVED — modifiedCount 0] "${product.name}" (${product._id})\n`);
            }
        }
    }

    console.log('\n──────────────── SUMMARY ────────────────');
    console.log(`Products scanned:   ${products.length}`);
    if (!DRY_RUN) {
        console.log(`Products updated:   ${productsUpdated}`);
        console.log(`Images migrated:    ${imagesMigrated}`);
        console.log(`Images failed:      ${imagesFailed}`);
        console.log(`\nMap file updated:   ${MAP_FILE}`);
    } else {
        console.log('\nThis was a DRY RUN — no images were downloaded/uploaded, no DB changes made.');
        console.log('Run again without --dry-run to actually migrate these images.');
    }

    await client.close();
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});