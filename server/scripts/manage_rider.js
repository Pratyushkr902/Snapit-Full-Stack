/**
 * server/scripts/manage_rider.js
 * 
 * Tool to manage riders in the Snapit MongoDB database:
 * - Deactivate a rider (e.g. when someone leaves)
 * - Add a new rider
 * - Promote an existing user to rider
 * - List all riders
 * 
 * Usage:
 *   node server/scripts/manage_rider.js list
 *   node server/scripts/manage_rider.js deactivate <mobile_or_email>
 *   node server/scripts/manage_rider.js promote <mobile_or_email>
 *   node server/scripts/manage_rider.js add --name "Rider Name" --mobile "9876543210" --email "rider@gmail.com"
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import bcryptjs from 'bcryptjs'
import connectDB from '../config/connectDB.js'
import UserModel from '../models/user.model.js'
import RiderDutyModel from '../models/riderDuty.model.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })
dotenv.config()

async function run() {
  await connectDB()
  console.log('✅ Connected to MongoDB\n')

  const args = process.argv.slice(2)
  const action = args[0]

  if (!action || action === 'list') {
    const riders = await UserModel.find({ role: 'RIDER' }).select('name email mobile status createdAt').lean()
    console.log(`📋 Total Riders in DB: ${riders.length}`)
    riders.forEach((r, idx) => {
      console.log(`  [${idx + 1}] ${r.name} | Mobile: ${r.mobile} | Email: ${r.email} | Status: ${r.status} | ID: ${r._id}`)
    })
    await mongoose.disconnect()
    return
  }

  if (action === 'deactivate') {
    const query = args[1]
    if (!query) {
      console.error('❌ Provide mobile number or email: node server/scripts/manage_rider.js deactivate 9608754853')
      process.exit(1)
    }
    const isNum = !isNaN(Number(query))
    const user = await UserModel.findOne({
      $or: [
        ...(isNum ? [{ mobile: Number(query) }] : []),
        { email: query.toLowerCase() },
      ]
    })
    if (!user) {
      console.error(`❌ No user found matching ${query}`)
      process.exit(1)
    }
    user.status = 'Inactive'
    await user.save()
    await RiderDutyModel.updateMany({ riderId: user._id }, { isDutyOn: false })
    console.log(`✅ Rider ${user.name} (${user.mobile || user.email}) is now marked INACTIVE.`)
    console.log(`   Orders will no longer be assigned to this rider.`)
    await mongoose.disconnect()
    return
  }

  if (action === 'promote') {
    const query = args[1]
    if (!query) {
      console.error('❌ Provide mobile number or email: node server/scripts/manage_rider.js promote 9876543210')
      process.exit(1)
    }
    const isNum = !isNaN(Number(query))
    const user = await UserModel.findOne({
      $or: [
        ...(isNum ? [{ mobile: Number(query) }] : []),
        { email: query.toLowerCase() },
      ]
    })
    if (!user) {
      console.error(`❌ No user found matching ${query}`)
      process.exit(1)
    }
    user.role = 'RIDER'
    user.status = 'Active'
    await user.save()
    console.log(`🎉 User ${user.name} (${user.mobile || user.email}) is now an ACTIVE RIDER!`)
    console.log(`   New orders will automatically dispatch to this rider.`)
    await mongoose.disconnect()
    return
  }

  if (action === 'add') {
    const nameIdx = args.indexOf('--name')
    const mobileIdx = args.indexOf('--mobile')
    const emailIdx = args.indexOf('--email')
    const passwordIdx = args.indexOf('--password')

    const name = nameIdx !== -1 ? args[nameIdx + 1] : null
    const mobile = mobileIdx !== -1 ? Number(args[mobileIdx + 1]) : null
    const email = emailIdx !== -1 ? args[emailIdx + 1] : null
    const password = passwordIdx !== -1 ? args[passwordIdx + 1] : crypto.randomBytes(6).toString('hex')

    if (!name || !mobile) {
      console.error('❌ Required: --name "..." --mobile "..." (optional: --email "...", --password "...")')
      process.exit(1)
    }

    const cleanEmail = (email || `rider_${mobile}@snapit.in`).toLowerCase()

    const existing = await UserModel.findOne({
      $or: [
        { mobile },
        { email: cleanEmail }
      ]
    })

    if (existing) {
      existing.role = 'RIDER'
      existing.status = 'Active'
      existing.name = name
      if (password) {
        const salt = await bcryptjs.genSalt(10)
        existing.password = await bcryptjs.hash(password, salt)
      }
      await existing.save()
      console.log(`✅ Existing user updated to ACTIVE RIDER: ${existing.name} (${existing.mobile})`)
    } else {
      const salt = await bcryptjs.genSalt(10)
      const hashedPassword = await bcryptjs.hash(password, salt)
      const newRider = await UserModel.create({
        name,
        mobile,
        email: cleanEmail,
        password: hashedPassword,
        role: 'RIDER',
        status: 'Active',
        verify_email: true,
      })
      console.log(`🎉 NEW RIDER CREATED SUCCESSFULLY!`)
      console.log(`   Name:     ${newRider.name}`)
      console.log(`   Mobile:   ${newRider.mobile}`)
      console.log(`   Email:    ${newRider.email}`)
      console.log(`   Password: ${password}`)
      console.log(`   Status:   Active`)
    }

    await mongoose.disconnect()
    return
  }

  console.log(`Unknown command: ${action}. Use 'list', 'deactivate', 'promote', or 'add'.`)
  await mongoose.disconnect()
}

run().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
