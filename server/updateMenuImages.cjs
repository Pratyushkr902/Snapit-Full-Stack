require('dotenv').config();
const mongoose = require('mongoose');

async function update() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const col = mongoose.connection.collection('menuitems');

  const satishId  = new mongoose.Types.ObjectId('6a34203c995b866a201bd7a1');
  const shreeRamId = new mongoose.Types.ObjectId('6a343566a9b1f31e3ba04832');

  // ── Satish Chowmein Center ──
  const satishImages = {
    'Chowmin':                'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&auto=format&fit=crop',
    'Chowmin Fry Manchurian': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&auto=format&fit=crop',
    'Mix Chowmin':            'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400&auto=format&fit=crop',
    'Fry Chowmin':            'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&auto=format&fit=crop',
    'Paneer Chowmin':         'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop',
    'Egg Chowmin':            'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop',
    'Chicken Chowmin':        'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop',
    'Manchurian':             'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=400&auto=format&fit=crop',
    'Fry Manchurian':         'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=400&auto=format&fit=crop',
    'Paneer Chilli':          'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop',
    'Paneer Roll':            'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop',
    'Egg Roll (2 Anda)':      'https://images.unsplash.com/photo-1606755456206-b25206cde27e?w=400&auto=format&fit=crop',
    'Chicken Chilli':         'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=400&auto=format&fit=crop',
    'Chicken Bone Fry':       'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&auto=format&fit=crop',
    'Chicken Boneless':       'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop',
    'Laccha Paratha':         'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop',
  };

  // ── Shree Ram Shop ──
  const shreeRamImages = {
    // Snacks
    'Samosa':               'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop',
    'Samosa Pair':          'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop',
    'Litti':                'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&auto=format&fit=crop',
    'Litti Pair':           'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&auto=format&fit=crop',
    // Chaat
    'Chaat (Half)':         'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&auto=format&fit=crop',
    'Chaat (Full)':         'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&auto=format&fit=crop',
    // Chenna Sweets
    'Raskadum (Per Piece)':          'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Raskadum (Half Kg)':            'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Raskadum (Full Kg)':            'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Kalakand (Per Piece)':          'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Kalakand (Half Kg)':            'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Kalakand (Full Kg)':            'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Khir Kadam (Per Piece)':        'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Khir Kadam (Half Kg)':          'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Khir Kadam (Full Kg)':          'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Khoa Roll (Per Piece)':         'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Khoa Roll (Half Kg)':           'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Khoa Roll (Full Kg)':           'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Creme Chalk (Per Piece)':       'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Creme Chalk (Half Kg)':         'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Creme Chalk (Full Kg)':         'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Kala Cream Chalk (Per Piece)':  'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Kala Cream Chalk (Half Kg)':    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Kala Cream Chalk (Full Kg)':    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Chenna Roll (Per Piece)':       'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Chenna Roll (Half Kg)':         'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Chenna Roll (Full Kg)':         'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Malai Toast (Per Piece)':       'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Malai Toast (Half Kg)':         'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Malai Toast (Full Kg)':         'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Malai Chamcham (Per Piece)':    'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Malai Chamcham (Half Kg)':      'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Malai Chamcham (Full Kg)':      'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Chhena (Per Piece)':            'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Chhena (Half Kg)':              'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Chhena (Full Kg)':              'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Rasbhari (Per Piece)':          'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Rasbhari (Half Kg)':            'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Rasbhari (Full Kg)':            'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Rajbhog (Per Piece)':           'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Rasmalai (Cup / 2 Pieces)':     'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Chenna Piece (Cup)':            'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'Guur Rasgulla (Per Piece)':     'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Guur Rasgulla (Half Kg)':       'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Guur Rasgulla (Full Kg)':       'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    // Barfi & Laddu
    'Kaju Barfi (Per Piece)':        'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Kaju Barfi (Half Kg)':          'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Kaju Barfi (Full Kg)':          'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Barfi / Pera (Per Piece)':      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Barfi / Pera (Half Kg)':        'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Barfi / Pera (Full Kg)':        'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Batisha (Per Piece)':           'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Batisha (Half Kg)':             'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Batisha (Full Kg)':             'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Milk Cake (Per Piece)':         'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Milk Cake (Half Kg)':           'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Milk Cake (Full Kg)':           'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop',
    'Besan Laddu (Per Piece)':       'https://images.unsplash.com/photo-1548365328-8c6db3220e4c?w=400&auto=format&fit=crop',
    'Besan Laddu (Half Kg)':         'https://images.unsplash.com/photo-1548365328-8c6db3220e4c?w=400&auto=format&fit=crop',
    'Besan Laddu (Full Kg)':         'https://images.unsplash.com/photo-1548365328-8c6db3220e4c?w=400&auto=format&fit=crop',
    'Motichoor Laddu (Per Piece)':   'https://images.unsplash.com/photo-1548365328-8c6db3220e4c?w=400&auto=format&fit=crop',
    'Motichoor Laddu (Half Kg)':     'https://images.unsplash.com/photo-1548365328-8c6db3220e4c?w=400&auto=format&fit=crop',
    'Motichoor Laddu (Full Kg)':     'https://images.unsplash.com/photo-1548365328-8c6db3220e4c?w=400&auto=format&fit=crop',
    // Kalajamun & Rasgulla
    'Kalajamun Large (Per Piece)':   'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Kalajamun Small (Per Piece)':   'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Kalajamun (Half Kg)':           'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Kalajamun (Full Kg)':           'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Rasgulla / Layi (Per Piece)':   'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Rasgulla / Layi (Half Kg)':     'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Rasgulla / Layi (Full Kg)':     'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Special Layi (Per Piece)':      'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Special Layi (Half Kg)':        'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    'Special Layi (Full Kg)':        'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&auto=format&fit=crop',
    // Drinks
    'Lassi':                         'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&auto=format&fit=crop',
  };

  // Update Satish items
  console.log('\nUpdating Satish Chowmein Center menu images...');
  let satishFixed = 0;
  for (const [name, image] of Object.entries(satishImages)) {
    const r = await col.updateOne(
      { restaurantId: satishId, name },
      { $set: { image, updatedAt: new Date() } }
    );
    if (r.matchedCount) satishFixed++;
    else console.log('  Not found:', name);
  }
  console.log(`✅ ${satishFixed} Satish items updated`);

  // Update Shree Ram items
  console.log('\nUpdating Shree Ram Shop menu images...');
  let shreeRamFixed = 0;
  for (const [name, image] of Object.entries(shreeRamImages)) {
    const r = await col.updateOne(
      { restaurantId: shreeRamId, name },
      { $set: { image, updatedAt: new Date() } }
    );
    if (r.matchedCount) shreeRamFixed++;
    else console.log('  Not found:', name);
  }
  console.log(`✅ ${shreeRamFixed} Shree Ram items updated`);

  await mongoose.disconnect();
  console.log('\nAll done!');
}

update().catch(e => { console.error(e); process.exit(1); });
