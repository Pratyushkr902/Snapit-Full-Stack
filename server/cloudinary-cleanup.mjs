/**
 * Snapit — Cloudinary Backlog Cleanup Script
 * Re-uploads all images in the "snapit" folder with compression,
 * then deletes the originals. Run once to clear the storage backlog.
 *
 * Usage (from server/ directory):
 *   CLOUDINARY_CLOUD_NAME=xxx CLOUDINARY_API_KEY=xxx CLOUDINARY_API_SECRET=xxx node ../cloudinary-cleanup.mjs
 *
 * Or add to server/.env and run:
 *   node --env-file=.env ../cloudinary-cleanup.mjs
 */

import { v2 as cloudinary } from 'cloudinary'
import https from 'https'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const FOLDER       = 'snapit'
const MAX_WIDTH    = 1000
const MAX_HEIGHT   = 1000
const DRY_RUN      = process.argv.includes('--dry-run') // pass --dry-run to preview only
const DELAY_MS     = 500  // throttle between uploads to avoid rate limits

// ─── helpers ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const fetchBuffer = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
    }).on('error', reject)
})

const reupload = (buffer, publicId) => new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
        {
            public_id: publicId,
            folder: FOLDER,
            overwrite: true,
            transformation: [
                { width: MAX_WIDTH, height: MAX_HEIGHT, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' },
            ],
        },
        (err, result) => err ? reject(err) : resolve(result)
    ).end(buffer)
})

// ─── fetch all resources in folder (handles pagination) ──────────────────────

async function fetchAllResources() {
    const all = []
    let nextCursor = null

    do {
        const params = { type: 'upload', prefix: FOLDER + '/', max_results: 100 }
        if (nextCursor) params.next_cursor = nextCursor

        const res = await cloudinary.api.resources(params)
        all.push(...res.resources)
        nextCursor = res.next_cursor || null
        console.log(`  Fetched ${all.length} resources so far...`)
    } while (nextCursor)

    return all
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n🔍 Fetching all images in folder "${FOLDER}"...`)
    const resources = await fetchAllResources()
    console.log(`\n📦 Found ${resources.length} images total.\n`)

    if (DRY_RUN) {
        console.log('DRY RUN — no changes will be made.\n')
    }

    let processed = 0, skipped = 0, failed = 0

    for (const resource of resources) {
        const { public_id, secure_url, bytes, width, height } = resource
        const sizeMB = (bytes / 1024 / 1024).toFixed(2)

        // Skip if already small enough (under 200KB and within dimension limit)
        if (bytes < 200_000 && width <= MAX_WIDTH && height <= MAX_HEIGHT) {
            console.log(`⏭  SKIP  ${public_id} (${sizeMB}MB, ${width}×${height} — already optimized)`)
            skipped++
            continue
        }

        console.log(`⚙️  PROCESS  ${public_id} (${sizeMB}MB, ${width}×${height})`)

        if (!DRY_RUN) {
            try {
                const buffer = await fetchBuffer(secure_url)
                const result = await reupload(buffer, public_id.replace(FOLDER + '/', ''))
                const newMB = (result.bytes / 1024 / 1024).toFixed(2)
                const saved = (((bytes - result.bytes) / bytes) * 100).toFixed(0)
                console.log(`   ✅ Done: ${newMB}MB  (saved ${saved}%)`)
                processed++
            } catch (err) {
                console.error(`   ❌ Failed: ${err.message}`)
                failed++
            }

            await sleep(DELAY_MS)
        } else {
            processed++
        }
    }

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Processed : ${processed}
⏭  Skipped   : ${skipped}
❌ Failed    : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${DRY_RUN ? '(DRY RUN — nothing was changed)' : 'Done! Check Cloudinary dashboard for new storage usage.'}
`)
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})