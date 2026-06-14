import { MongoClient, ObjectId } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const ALKA_ID = new ObjectId('6a2c30d7159ffb6c46268d96');

const menuItems = [
  // Veg Starter
  { name:'Onion Pakoda',      price:159, category:'Veg Starter' },
  { name:'Veg Cutlet',        price:159, category:'Veg Starter' },
  { name:'Hara Bhara Kabab',  price:169, category:'Veg Starter' },
  { name:'Veg Manchurian',    price:220, category:'Veg Starter' },
  { name:'Veg Pakoda',        price:199, category:'Veg Starter' },
  { name:'Paneer Pakoda',     price:199, category:'Veg Starter' },
  { name:'Paneer Manchurian', price:249, category:'Veg Starter' },
  { name:'Paneer Chilly',     price:219, category:'Veg Starter' },
  { name:'Mushroom Chilly',   price:239, category:'Veg Starter' },
  { name:'Paneer Tikka',      price:259, category:'Veg Starter' },
  { name:'Baby Corn Chilly',  price:249, category:'Veg Starter' },
  { name:'Paneer 65',         price:259, category:'Veg Starter' },

  // Non-Veg Starter
  { name:'Chicken Chilly Bone',  price:229, category:'Non-Veg Starter' },
  { name:'Chicken Boneless',     price:229, category:'Non-Veg Starter' },
  { name:'Chicken Pakoda',       price:249, category:'Non-Veg Starter' },
  { name:'Chicken Lollipop',     price:289, category:'Non-Veg Starter' },
  { name:'Chicken 65',           price:289, category:'Non-Veg Starter' },
  { name:'Chicken Tandoor',      price:499, category:'Non-Veg Starter' },
  { name:'Egg Pakoda',           price:159, category:'Non-Veg Starter' },
  { name:'Chicken Fry',          price:229, category:'Non-Veg Starter' },
  { name:'Chicken Leg Kabab',    price:229, category:'Non-Veg Starter' },
  { name:'Chicken Seekh Kabab',  price:299, category:'Non-Veg Starter' },
  { name:'Chicken Tikka',        price:329, category:'Non-Veg Starter' },

  // Egg Items
  { name:'Egg Curry',      price:99,  category:'Egg Items' },
  { name:'Egg Masala',     price:119, category:'Egg Items' },
  { name:'Egg Pyaza',      price:129, category:'Egg Items' },
  { name:'Omelette Curry', price:129, category:'Egg Items' },
  { name:'Egg Bhurji',     price:99,  category:'Egg Items' },

  // Veg Main Course
  { name:'Palak Paneer',           price:209, category:'Veg Main Course' },
  { name:'Paneer Masala',          price:209, category:'Veg Main Course' },
  { name:'Paneer Istu',            price:229, category:'Veg Main Course' },
  { name:'Paneer Pyaza',           price:229, category:'Veg Main Course' },
  { name:'Paneer Kadhai',          price:229, category:'Veg Main Course' },
  { name:'Mutter Paneer',          price:229, category:'Veg Main Course' },
  { name:'Paneer Butter Masala',   price:239, category:'Veg Main Course' },
  { name:'Mushroom Masala',        price:229, category:'Veg Main Course' },
  { name:'Mushroom Istu',          price:239, category:'Veg Main Course' },
  { name:'Mushroom Pyaza',         price:239, category:'Veg Main Course' },
  { name:'Mushroom Kadhai',        price:239, category:'Veg Main Course' },
  { name:'Mushroom Mattar',        price:239, category:'Veg Main Course' },
  { name:'Mushroom Butter Masala', price:249, category:'Veg Main Course' },
  { name:'Shahi Paneer',           price:249, category:'Veg Main Course' },
  { name:'Paneer Punjabi',         price:259, category:'Veg Main Course' },
  { name:'Paneer Dewani',          price:299, category:'Veg Main Course' },
  { name:'Paneer Dehati',          price:469, category:'Veg Main Course' },
  { name:'Paneer Special',         price:299, category:'Veg Main Course' },
  { name:'Kaju Masala',            price:299, category:'Veg Main Course' },

  // Non-Veg Main Course
  { name:'Chicken Curry',        price:229, category:'Non-Veg Main Course' },
  { name:'Chicken Masala',       price:229, category:'Non-Veg Main Course' },
  { name:'Chicken Kadhai',       price:249, category:'Non-Veg Main Course' },
  { name:'Chicken Handi',        price:289, category:'Non-Veg Main Course' },
  { name:'Chicken Lajawab',      price:239, category:'Non-Veg Main Course' },
  { name:'Chicken Lapata',       price:299, category:'Non-Veg Main Course' },
  { name:'Chicken Diwani',       price:299, category:'Non-Veg Main Course' },
  { name:'Chicken Kalimirch',    price:559, category:'Non-Veg Main Course' },
  { name:'Chicken Lababdar',     price:259, category:'Non-Veg Main Course' },
  { name:'Chicken Noorani',      price:299, category:'Non-Veg Main Course' },
  { name:'Chicken Awas Special', price:299, category:'Non-Veg Main Course' },
  { name:'Chicken Tawa Masala',  price:259, category:'Non-Veg Main Course' },
  { name:'Chicken Dehati',       price:269, category:'Non-Veg Main Course' },
  { name:'Murg Musallam',        price:549, category:'Non-Veg Main Course' },
  { name:'Chicken Punjabi',      price:289, category:'Non-Veg Main Course' },

  // Bread
  { name:'Tandoori Roti',     price:15, category:'Bread' },
  { name:'Butter Roti',       price:20, category:'Bread' },
  { name:'Butter Naan',       price:40, category:'Bread' },
  { name:'Garlic Naan',       price:60, category:'Bread' },
  { name:'Lachha Paratha',    price:70, category:'Bread' },
  { name:'Masala Kulcha',     price:70, category:'Bread' },
  { name:'Paneer Stuff Naan', price:99, category:'Bread' },

  // Rice
  { name:'Plain Rice',         price:89,  category:'Rice' },
  { name:'Jeera Rice',         price:109, category:'Rice' },
  { name:'Veg Fried Rice',     price:149, category:'Rice' },
  { name:'Egg Fried Rice',     price:170, category:'Rice' },
  { name:'Veg Pulao',          price:149, category:'Rice' },
  { name:'Chicken Fried Rice', price:179, category:'Rice' },
  { name:'Chicken Fry Rice',   price:179, category:'Rice' },
  { name:'Mix Rice',           price:159, category:'Rice' },

  // Biryani
  { name:'Chicken Biryani',         price:210, category:'Biryani' },
  { name:'Chicken Special Biryani', price:249, category:'Biryani' },
  { name:'Mutton Biryani',          price:259, category:'Biryani' },

  // Sabji & Dal
  { name:'Mix Veg',          price:209, category:'Sabji & Dal' },
  { name:'Soyabean',         price:149, category:'Sabji & Dal' },
  { name:'Aloo Dum Punjabi', price:169, category:'Sabji & Dal' },
  { name:'Aloo Dum Kashmiri',price:169, category:'Sabji & Dal' },
  { name:'Aloo Mutter',      price:179, category:'Sabji & Dal' },
  { name:'Malai Kofta',      price:189, category:'Sabji & Dal' },
  { name:'Dal Fry',          price:79,  category:'Sabji & Dal' },
  { name:'Makhani Dal',      price:119, category:'Sabji & Dal' },

  // Snacks & Chowmein
  { name:'Seasonal Bhujia',  price:99,  category:'Snacks & Chowmein' },
  { name:'Paneer Bhujia',    price:109, category:'Snacks & Chowmein' },
  { name:'Bhindi Bhujia',    price:99,  category:'Snacks & Chowmein' },
  { name:'Patal Bhujia',     price:99,  category:'Snacks & Chowmein' },
  { name:'Veg Chowmein',     price:149, category:'Snacks & Chowmein' },
  { name:'Egg Chowmein',     price:169, category:'Snacks & Chowmein' },
  { name:'Chicken Chowmein', price:199, category:'Snacks & Chowmein' },
  { name:'Veg Chaos',        price:149, category:'Snacks & Chowmein' },

  // Extras & Salad
  { name:'Onion Salad', price:49, category:'Extras & Salad' },
  { name:'Green Salad', price:99, category:'Extras & Salad' },
  { name:'Raita',       price:98, category:'Extras & Salad' },
  { name:'Lassi',       price:49, category:'Extras & Salad' },

  // Sweets & Dessert
  { name:'Papad Fry',       price:29, category:'Sweets & Dessert' },
  { name:'Masala Papad',    price:49, category:'Sweets & Dessert' },
  { name:'Hot Gulab Jamun', price:15, category:'Sweets & Dessert' },
  { name:'Rasgulla',        price:20, category:'Sweets & Dessert' },
  { name:'Ice Cream',       price:69, category:'Sweets & Dessert' },
];

const menuCategories = [
  'Veg Starter', 'Non-Veg Starter', 'Egg Items',
  'Veg Main Course', 'Non-Veg Main Course',
  'Bread', 'Rice', 'Biryani', 'Sabji & Dal',
  'Snacks & Chowmein', 'Extras & Salad', 'Sweets & Dessert',
];

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  console.log('Connected to MongoDB');
  const col = client.db('snapit').collection('restaurants');
  const result = await col.updateOne(
    { _id: ALKA_ID },
    { $set: { menuItems, menuCategories, updatedAt: new Date() } }
  );
  console.log('✅ Alka Restaurant menu updated — ' + menuItems.length + ' items across ' + menuCategories.length + ' categories');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
