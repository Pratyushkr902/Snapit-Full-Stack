import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// R2 config
const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const downloadImage = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return { buffer, contentType };
};

const migrateAll = async () => {
    console.log('🚀 Starting Cloudinary → R2 migration...\n');

    let nextCursor = null;
    let totalProcessed = 0;
    let totalFailed = 0;
    const urlMap = {}; // old cloudinary url -> new r2 url

    do {
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'snapit',
            max_results: 100,
            next_cursor: nextCursor,
        });

        for (const resource of result.resources) {
            const cloudinaryUrl = resource.secure_url;
            const extension = resource.format || 'jpg';
            const fileName = `snapit/${randomUUID()}.${extension}`;

            try {
                const { buffer, contentType } = await downloadImage(cloudinaryUrl);

                await s3.send(new PutObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileName,
                    Body: buffer,
                    ContentType: contentType,
                }));

                const r2Url = `${process.env.R2_PUBLIC_URL}/${fileName}`;
                urlMap[cloudinaryUrl] = r2Url;
                totalProcessed++;
                console.log(`✅ [${totalProcessed}] ${resource.public_id}`);

                await sleep(100); // avoid rate limiting
            } catch (err) {
                totalFailed++;
                console.error(`❌ Failed: ${resource.public_id} — ${err.message}`);
            }
        }

        nextCursor = result.next_cursor;
    } while (nextCursor);

    // Save URL mapping to file for DB update later
    const fs = await import('fs');
    fs.writeFileSync('./migration-url-map.json', JSON.stringify(urlMap, null, 2));

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Migrated  : ${totalProcessed}`);
    console.log(`❌ Failed    : ${totalFailed}`);
    console.log(`📄 URL map saved to: ./migration-url-map.json`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
};

migrateAll().catch(console.error);