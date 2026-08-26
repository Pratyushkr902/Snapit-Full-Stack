// Search Snapit's User collection for a name (case-insensitive, partial match).
// Run from your server/ directory: node ../search_user.mjs "Avinash Singh"
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: './server/.env' })

const searchTerm = process.argv[2]
if (!searchTerm) {
    console.error('Usage: node search_user.mjs "name to search"')
    process.exit(1)
}

const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' })
const UserModel = mongoose.model('User', UserSchema)

async function run() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log(`🔍 Searching users for "${searchTerm}"...\n`)

    const users = await UserModel.find({
        name: { $regex: searchTerm, $options: 'i' }
    }).select('name email mobile role store_name isSnapitPlusMember createdAt').lean()

    if (users.length === 0) {
        console.log('No matching users found.')
    } else {
        users.forEach(u => {
            console.log('──────────────────────────────')
            console.log('ID:        ', u._id.toString())
            console.log('Name:      ', u.name)
            console.log('Email:     ', u.email)
            console.log('Mobile:    ', u.mobile || '(none)')
            console.log('Role:      ', u.role)
            console.log('Store name:', u.store_name || '(none)')
            console.log('Created:   ', u.createdAt)
        })
        console.log('──────────────────────────────')
        console.log(`\n${users.length} match(es) found.`)
    }

    await mongoose.disconnect()
}

run().catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
})
