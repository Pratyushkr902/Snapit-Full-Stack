import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in server/.env');
    process.exit(1);
}

// Minimal schemas for direct inspection and safe reconciliation
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    mobile: Number,
    walletBalance: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    claimedMilestones: [Number],
    lastCheckin: Date,
    walletTransactions: [
        {
            type: { type: String },
            amount: Number,
            description: String,
            date: Date
        }
    ]
}, { timestamps: true });

const walletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    balance: { type: Number, default: 0 },
    transactions: [
        {
            amount: Number,
            type: { type: String },
            description: String,
            referenceId: String,
            date: Date
        }
    ]
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);

const isExecute = process.argv.includes('--execute');

async function run() {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(' Connected to MongoDB Atlas.');

    // 1. Inspect all distinct transaction descriptions in UserModel
    console.log('\n--- 1. AUDITING DISTINCT TRANSACTION DESCRIPTIONS IN DB ---');
    const distinctDescriptions = await User.distinct('walletTransactions.description');
    console.log('Found', distinctDescriptions.length, 'distinct descriptions:');
    distinctDescriptions.forEach(desc => console.log('  •', desc));

    // 2. Identify all streak / check-in / milestone pattern descriptions
    const streakPattern = /check-in|streak|milestone/i;
    const matchingDescriptions = distinctDescriptions.filter(d => streakPattern.test(d || ''));
    console.log('\nStreak/Checkin matching descriptions:', matchingDescriptions);

    // 3. Find all users with any matching transaction or streak activity
    const usersWithStreakTx = await User.find({
        'walletTransactions.description': { $regex: streakPattern }
    }).lean();

    console.log(`\n--- 2. FOUND ${usersWithStreakTx.length} USERS WITH STREAK/CHECKIN TRANSACTIONS ---`);

    let totalLeakedINR = 0;
    let totalDeductedINR = 0;
    const report = [];

    for (const u of usersWithStreakTx) {
        const streakCreditTxs = (u.walletTransactions || []).filter(tx => {
            const isMatch = streakPattern.test(tx.description || '');
            const isCredit = (tx.type || '').toUpperCase() === 'CREDIT';
            return isMatch && isCredit;
        });

        const totalStreakCreditedINR = streakCreditTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        totalLeakedINR += totalStreakCreditedINR;

        const currentWallet = Number(u.walletBalance) || 0;
        const currentCoins = Number(u.coins) || 0;

        // Deduction amount: capped by current balance so balance never drops below 0
        const plannedDeduction = Math.min(currentWallet, totalStreakCreditedINR);
        const newWalletBalance = Math.max(0, currentWallet - totalStreakCreditedINR);
        totalDeductedINR += plannedDeduction;

        // Ensure user retains their coins as loyalty points (at least equal to the total streak rewards earned)
        // If currentCoins is already >= totalStreakCreditedINR, they have coins. If not, top up coins to match.
        const targetCoins = Math.max(currentCoins, totalStreakCreditedINR);

        report.push({
            userId: u._id.toString(),
            name: u.name,
            email: u.email,
            mobile: u.mobile,
            currentWallet,
            totalStreakCreditedINR,
            newWalletBalance,
            plannedDeduction,
            currentCoins,
            targetCoins,
            transactions: streakCreditTxs.map(t => ({ amount: t.amount, desc: t.description, date: t.date }))
        });
    }

    console.log(JSON.stringify(report, null, 2));

    console.log('\n--- 3. FINANCIAL SUMMARY ---');
    console.log(`Total Streak INR Credited (Leakage): ₹${totalLeakedINR}`);
    console.log(`Total INR to be Recovered:          ₹${totalDeductedINR}`);
    console.log(`Mode:                                ${isExecute ? '⚡ LIVE EXECUTION' : '🛡️ DRY RUN (No database changes made)'}`);

    if (!isExecute) {
        console.log('\nTo apply changes and update all wallets & coins, rerun with:');
        console.log('  node server/scripts/reconcile_streak_wallets.js --execute\n');
        await mongoose.disconnect();
        return;
    }

    // 4. Apply changes if --execute
    console.log('\n--- 4. EXECUTING RECONCILIATION ---');
    for (const item of report) {
        const adjustmentTx = {
            type: 'DEBIT',
            amount: item.plannedDeduction,
            description: 'Snapit System Adjustment: Streak rewards converted to Snapit Loyalty Coins',
            date: new Date()
        };

        const updateOps = {
            $set: {
                walletBalance: item.newWalletBalance,
                coins: item.targetCoins
            }
        };

        if (item.plannedDeduction > 0) {
            updateOps.$push = {
                walletTransactions: {
                    $each: [adjustmentTx],
                    $position: 0
                }
            };
        }

        await User.findByIdAndUpdate(item.userId, updateOps);

        // Also sync WalletModel if exists
        const walletDoc = await Wallet.findOne({ userId: item.userId });
        if (walletDoc) {
            walletDoc.balance = item.newWalletBalance;
            if (item.plannedDeduction > 0) {
                walletDoc.transactions.unshift({
                    amount: item.plannedDeduction,
                    type: 'debit',
                    description: 'Snapit System Adjustment: Streak rewards converted to Snapit Loyalty Coins',
                    date: new Date()
                });
            }
            await walletDoc.save();
        }

        console.log(`✅ User ${item.email || item.name} (${item.userId}): Wallet ₹${item.currentWallet} -> ₹${item.newWalletBalance} (Coins: ${item.currentCoins} -> ${item.targetCoins})`);
    }

    console.log('\n Reconciliation completed successfully!');
    await mongoose.disconnect();
}

run().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
