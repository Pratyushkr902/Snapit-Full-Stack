import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import connectDB from '../server/config/connectDB.js';
import UserModel from '../server/models/user.model.js';

async function main() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB via connectDB');

    const roles = ['USER', 'RIDER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'];
    const tokens = {};
    const userInfo = {};

    for (const role of roles) {
      let user = await UserModel.findOne({ role }).lean();
      if (!user) {
        console.log(`Creating test user for role: ${role}`);
        const newUser = new UserModel({
          name: `K6 Test ${role}`,
          email: `k6_test_${role.toLowerCase()}@snapit.io`,
          role: role,
          store_name: role === 'SELLER' ? 'Snapit Store' : null,
          status: 'Active',
          walletBalance: 500
        });
        user = await newUser.save();
      }

      const token = jwt.sign(
        { id: user._id.toString(), role: user.role },
        process.env.SECRET_KEY_ACCESS_TOKEN,
        { expiresIn: '30d' }
      );

      tokens[role] = token;
      userInfo[role] = { id: user._id.toString(), email: user.email, role: user.role };
      console.log(`✅ Role ${role}: User ID ${user._id} (${user.email})`);
    }

    const outputPath = path.resolve('tests/tokens.json');
    fs.writeFileSync(outputPath, JSON.stringify({ tokens, userInfo }, null, 2));
    console.log(`\n🎉 Successfully saved all 5 role tokens to ${outputPath}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error generating tokens:', err);
    process.exit(1);
  }
}

main();
