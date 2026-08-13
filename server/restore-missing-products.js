/**
 * restore-missing-products.js
 *
 * Compares a BACKUP source (an Atlas snapshot you restored to a temp
 * cluster/collection, an old database, or another collection) against your
 * LIVE products collection, and restores anything that's missing - using the
 * ORIGINAL _id so other collections referencing that product (orders, cart
 * items, image mappings, etc.) keep working correctly.
 *
 * Matching logic:
 *   1. Same _id already exists in live DB?              -> SKIP (already there)
 *   2. No _id match, but an exact normalized name match? -> FLAG (same product,
 *      different _id - likely re-inserted after deletion with a new ID during
 *      the migration. Needs a manual decision: keep new ID or replace with old).
 *   3. No _id match, no name match at all?                -> RESTORE (insert
 *      using the original document, including its original _id).
 *
 * This makes NO changes until you run without --dry-run.
 *
 * ---- CONFIG (set as environment variables before running) ----
 *
 * Live (target) database - the one your app actually uses:
 *   TARGET_URI         e.g. mongodb+srv://user:pass@cluster.mongodb.net/snapit
 *   TARGET_COLLECTION  default "products"
 *
 * Backup (source) database - wherever the pre-migration data lives:
 *   SOURCE_URI         connection string to the backup (can be the SAME
 *                      cluster, just a different db/collection - or a totally
 *                      different cluster if you restored a snapshot elsewhere)
 *   SOURCE_COLLECTION  default "products"
 *
 * If the backup is a different DATABASE on the same cluster rather than a
 * different URI entirely, just include the db name in SOURCE_URI's path,
 * e.g. mongodb+srv://user:pass@cluster.mongodb.net/snapit_backup
 *
 * ---- USAGE ----
 *   npm install mongoose
 *   export TARGET_URI="mongodb+srv://user:pass@cluster.mongodb.net/snapit"
 *   export SOURCE_URI="mongodb+srv://user:pass@cluster.mongodb.net/snapit_backup"
 *   node restore-missing-products.js --dry-run      # preview only, no changes
 *   node restore-missing-products.js                # actually restore
 */

const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

const TARGET_URI = process.env.TARGET_URI || process.env.MONGODB_URI;
const SOURCE_URI = process.env.SOURCE_URI;
const TARGET_COLLECTION = process.env.TARGET_COLLECTION || 'products';
const SOURCE_COLLECTION = process.env.SOURCE_COLLECTION || 'products';

if (!TARGET_URI || !SOURCE_URI) {
  console.error('ERROR: Set both TARGET_URI and SOURCE_URI environment variables.');
  console.error('  TARGET_URI = your live database (the app actually reads from this)');
  console.error('  SOURCE_URI = your backup/old data (snapshot restore, old db, etc.)');
  process.exit(1);
}

function normalize(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('Connecting to TARGET (live) database...');
  const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
  const TargetProduct = targetConn.model(
    'TargetProduct',
    new mongoose.Schema({}, { strict: false, collection: TARGET_COLLECTION })
  );

  console.log('Connecting to SOURCE (backup) database...');
  const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  const SourceProduct = sourceConn.model(
    'SourceProduct',
    new mongoose.Schema({}, { strict: false, collection: SOURCE_COLLECTION })
  );

  const liveProducts = await TargetProduct.find({}).lean();
  const backupProducts = await SourceProduct.find({}).lean();

  console.log(`\nLive products:   ${liveProducts.length}`);
  console.log(`Backup products: ${backupProducts.length}\n`);

  const liveIds = new Set(liveProducts.map(p => String(p._id)));
  const liveNameIndex = new Map(); // normalized name -> raw name
  for (const p of liveProducts) {
    liveNameIndex.set(normalize(p.name), p.name);
  }

  const toRestore = [];
  const toFlag = [];
  const toSkip = [];

  for (const backupDoc of backupProducts) {
    const idStr = String(backupDoc._id);

    if (liveIds.has(idStr)) {
      toSkip.push(backupDoc);
      continue;
    }

    const normName = normalize(backupDoc.name);
    if (liveNameIndex.has(normName)) {
      toFlag.push({ backupDoc, matchedName: liveNameIndex.get(normName) });
      continue;
    }

    toRestore.push(backupDoc);
  }

  console.log('================ SUMMARY ================');
  console.log(`Already present (same _id):           ${toSkip.length}`);
  console.log(`Name exists under a DIFFERENT _id:    ${toFlag.length} (flagged, not touched)`);
  console.log(`Missing entirely - will restore:      ${toRestore.length}`);
  console.log('===========================================\n');

  if (toFlag.length) {
    console.log('--- FLAGGED: same product name exists live, but under a different _id ---');
    console.log('(Likely re-created during migration with a new ID. Decide manually whether');
    console.log(' to keep the live one, or delete it and restore the original _id instead.)\n');
    toFlag.forEach(f =>
      console.log(`  "${f.backupDoc.name}" - backup _id ${f.backupDoc._id} vs live name match "${f.matchedName}"`)
    );
    console.log('');
  }

  if (toRestore.length) {
    console.log('--- WILL RESTORE (missing entirely from live DB) ---');
    toRestore.forEach(p => console.log(`  ${p._id}  "${p.name}"  (${p.unit || 'no unit'})`));
    console.log('');
  }

  if (DRY_RUN) {
    console.log('DRY RUN: no changes made. Re-run without --dry-run to actually restore.');
  } else if (toRestore.length === 0) {
    console.log('Nothing to restore.');
  } else {
    // Insert preserving the original _id and all original fields.
    const result = await TargetProduct.insertMany(toRestore, { ordered: false });
    console.log(`Restored ${result.length} products into "${TARGET_COLLECTION}" with original _id values.`);
  }

  await targetConn.close();
  await sourceConn.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});