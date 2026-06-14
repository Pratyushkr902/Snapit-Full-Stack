import { MongoClient, ObjectId } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const menuItems = [
  // Veg Biryani
  { name:'Vegetable Biryani (Half)',         price:109, category:'Veg Biryani' },
  { name:'Vegetable Biryani (Full)',         price:179, category:'Veg Biryani' },
  { name:'Zaitooni Biryani (Half)',          price:109, category:'Veg Biryani' },
  { name:'Zaitooni Biryani (Full)',          price:189, category:'Veg Biryani' },
  { name:'Biryani Makhani Paneer (Half)',    price:119, category:'Veg Biryani' },
  { name:'Biryani Makhani Paneer (Full)',    price:209, category:'Veg Biryani' },
  { name:'Hyderabadi Biryani Veg (Half)',    price:129, category:'Veg Biryani' },
  { name:'Hyderabadi Biryani Veg (Full)',    price:229, category:'Veg Biryani' },

  // Non-Veg Biryani
  { name:'Egg Biryani (Half)',               price:129, category:'Non-Veg Biryani' },
  { name:'Egg Biryani (Full)',               price:229, category:'Non-Veg Biryani' },
  { name:'Chicken Biryani (Half)',           price:149, category:'Non-Veg Biryani' },
  { name:'Chicken Biryani (Full)',           price:269, category:'Non-Veg Biryani' },
  { name:'Kolkata Biryani (Half)',           price:169, category:'Non-Veg Biryani' },
  { name:'Kolkata Biryani (Full)',           price:289, category:'Non-Veg Biryani' },
  { name:'Chicken Tikka Biryani (Half)',     price:189, category:'Non-Veg Biryani' },
  { name:'Chicken Tikka Biryani (Full)',     price:299, category:'Non-Veg Biryani' },
  { name:'Seekh Kebab Biryani (Half)',       price:229, category:'Non-Veg Biryani' },
  { name:'Seekh Kebab Biryani (Full)',       price:349, category:'Non-Veg Biryani' },
  { name:'Chicken Handi Biryani (Half)',     price:189, category:'Non-Veg Biryani' },
  { name:'Chicken Handi Biryani (Full)',     price:299, category:'Non-Veg Biryani' },

  // Mutton Biryani
  { name:'Mutton Dum Biryani (Half)',        price:199, category:'Mutton Biryani' },
  { name:'Mutton Dum Biryani (Full)',        price:299, category:'Mutton Biryani' },
  { name:'Mutton Kolkata Biryani (Half)',    price:219, category:'Mutton Biryani' },
  { name:'Mutton Kolkata Biryani (Full)',    price:329, category:'Mutton Biryani' },
  { name:'Mutton Seekh Kebab Biryani (Half)',price:229, category:'Mutton Biryani' },
  { name:'Mutton Seekh Kebab Biryani (Full)',price:349, category:'Mutton Biryani' },
  { name:'Mutton Tikka Biryani (Half)',      price:239, category:'Mutton Biryani' },
  { name:'Mutton Tikka Biryani (Full)',      price:389, category:'Mutton Biryani' },
  { name:'Mutton Hyderabadi Biryani (Half)', price:249, category:'Mutton Biryani' },
  { name:'Mutton Hyderabadi Biryani (Full)', price:399, category:'Mutton Biryani' },
  { name:'Mutton Handi Biryani (Half)',      price:249, category:'Mutton Biryani' },
  { name:'Mutton Handi Biryani (Full)',      price:399, category:'Mutton Biryani' },

  // Veg Starters
  { name:'Veg Seekh Kebab',          price:135, category:'Veg Starters' },
  { name:'Veg Kebab',                price:145, category:'Veg Starters' },
  { name:'Mushroom Tikka',           price:145, category:'Veg Starters' },
  { name:'Hara Bhara Kebab',         price:145, category:'Veg Starters' },
  { name:'Paneer Tikka',             price:160, category:'Veg Starters' },

  // Non-Veg Starters
  { name:'Chicken Galouti Kebab',     price:175, category:'Non-Veg Starters' },
  { name:'Chicken Seekh Kebab',       price:175, category:'Non-Veg Starters' },
  { name:'Chicken Malai Seekh Kebab', price:189, category:'Non-Veg Starters' },
  { name:'Chicken Tikka',             price:199, category:'Non-Veg Starters' },
  { name:'Mutton Seekh Kebab',        price:219, category:'Non-Veg Starters' },
  { name:'Chicken Tangdi Kabab',      price:249, category:'Non-Veg Starters' },

  // Soup
  { name:'Manchow Soup (Veg)',        price:79,  category:'Soup' },
  { name:'Manchow Soup (Non-Veg)',    price:99,  category:'Soup' },
  { name:'Schezwan Soup (Veg)',       price:79,  category:'Soup' },
  { name:'Schezwan Soup (Non-Veg)',   price:99,  category:'Soup' },
  { name:'Tomato Soup',               price:79,  category:'Soup' },
  { name:'Mix Veg Soup',              price:79,  category:'Soup' },
  { name:'Sweet Corn Soup (Veg)',     price:79,  category:'Soup' },
  { name:'Sweet Corn Soup (Non-Veg)', price:99,  category:'Soup' },
  { name:'Hot & Sour Soup (Veg)',     price:79,  category:'Soup' },
  { name:'Hot & Sour Soup (Non-Veg)', price:99,  category:'Soup' },
  { name:'Chicken Soup',              price:130, category:'Soup' },
  { name:'Chicken Egg Soup',          price:130, category:'Soup' },

  // Veg Chinese
  { name:'Paneer Noodles (Half)',       price:149, category:'Veg Chinese' },
  { name:'Paneer Noodles (Full)',       price:189, category:'Veg Chinese' },
  { name:'Veg Noodles (Half)',          price:109, category:'Veg Chinese' },
  { name:'Veg Noodles (Full)',          price:179, category:'Veg Chinese' },
  { name:'Veg Schezwan Noodles (Half)', price:109, category:'Veg Chinese' },
  { name:'Veg Schezwan Noodles (Full)', price:179, category:'Veg Chinese' },
  { name:'Hakka Noodles (Half)',        price:129, category:'Veg Chinese' },
  { name:'Hakka Noodles (Full)',        price:179, category:'Veg Chinese' },
  { name:'Chilly Potato',               price:149, category:'Veg Chinese' },
  { name:'Veg Manchurian Dry',          price:149, category:'Veg Chinese' },
  { name:'Veg Manchurian Gravy',        price:149, category:'Veg Chinese' },
  { name:'Chilly Paneer Dry',           price:159, category:'Veg Chinese' },
  { name:'Chilly Paneer Gravy',         price:159, category:'Veg Chinese' },
  { name:'Veg Fried Rice (Half)',       price:129, category:'Veg Chinese' },
  { name:'Veg Fried Rice (Full)',       price:189, category:'Veg Chinese' },
  { name:'Schezwan Fried Rice (Half)',  price:139, category:'Veg Chinese' },
  { name:'Schezwan Fried Rice (Full)',  price:189, category:'Veg Chinese' },

  // Non-Veg Chinese
  { name:'Egg Noodle (Half)',                price:159, category:'Non-Veg Chinese' },
  { name:'Egg Noodle (Full)',                price:199, category:'Non-Veg Chinese' },
  { name:'Chicken Noodle (Half)',            price:179, category:'Non-Veg Chinese' },
  { name:'Chicken Noodle (Full)',            price:209, category:'Non-Veg Chinese' },
  { name:'Egg Chicken Noodle (Half)',        price:179, category:'Non-Veg Chinese' },
  { name:'Egg Chicken Noodle (Full)',        price:209, category:'Non-Veg Chinese' },
  { name:'Chicken Chilly Dry (Half)',        price:199, category:'Non-Veg Chinese' },
  { name:'Chicken Chilly Dry (Full)',        price:239, category:'Non-Veg Chinese' },
  { name:'Chicken Chilly Gravy (Half)',      price:199, category:'Non-Veg Chinese' },
  { name:'Chicken Chilly Gravy (Full)',      price:239, category:'Non-Veg Chinese' },
  { name:'Chicken Manchurian Dry (Half)',    price:199, category:'Non-Veg Chinese' },
  { name:'Chicken Manchurian Dry (Full)',    price:239, category:'Non-Veg Chinese' },
  { name:'Chicken Manchurian Gravy (Half)',  price:199, category:'Non-Veg Chinese' },
  { name:'Chicken Manchurian Gravy (Full)',  price:239, category:'Non-Veg Chinese' },
  { name:'Chicken Lollipop (Half)',          price:199, category:'Non-Veg Chinese' },
  { name:'Chicken Lollipop (Full)',          price:239, category:'Non-Veg Chinese' },
  { name:'Chicken Fried Rice (Half)',        price:199, category:'Non-Veg Chinese' },
  { name:'Chicken Fried Rice (Full)',        price:239, category:'Non-Veg Chinese' },
  { name:'Chicken Schezwan Fried Rice (Half)',price:199,category:'Non-Veg Chinese' },
  { name:'Chicken Schezwan Fried Rice (Full)',price:239,category:'Non-Veg Chinese' },
  { name:'Chicken 65 (Half)',                price:209, category:'Non-Veg Chinese' },
  { name:'Chicken 65 (Full)',                price:320, category:'Non-Veg Chinese' },

  // Dal
  { name:'Dal Fry',           price:99,  category:'Dal' },
  { name:'Dal Tadka',         price:99,  category:'Dal' },
  { name:'Lasooni Dal Tadka', price:109, category:'Dal' },
  { name:'Dal Makhani',       price:129, category:'Dal' },

  // Veg Main Course
  { name:'Kadai Paneer (Half)',         price:129, category:'Veg Main Course' },
  { name:'Kadai Paneer (Full)',         price:249, category:'Veg Main Course' },
  { name:'Paneer Lababdar (Half)',      price:159, category:'Veg Main Course' },
  { name:'Paneer Lababdar (Full)',      price:249, category:'Veg Main Course' },
  { name:'Paneer Butter Masala (Half)', price:159, category:'Veg Main Course' },
  { name:'Paneer Butter Masala (Full)', price:249, category:'Veg Main Course' },
  { name:'Mutter Paneer (Half)',        price:159, category:'Veg Main Course' },
  { name:'Mutter Paneer (Full)',        price:249, category:'Veg Main Course' },
  { name:'Shahi Paneer (Half)',         price:159, category:'Veg Main Course' },
  { name:'Shahi Paneer (Full)',         price:249, category:'Veg Main Course' },

  // Non-Veg Main Course
  { name:'Egg Curry (Half)',            price:110, category:'Non-Veg Main Course' },
  { name:'Egg Curry (Full)',            price:170, category:'Non-Veg Main Course' },
  { name:'Butter Chicken (Half)',       price:169, category:'Non-Veg Main Course' },
  { name:'Butter Chicken (Full)',       price:309, category:'Non-Veg Main Course' },
  { name:'Chicken Tikka Masala (Half)', price:179, category:'Non-Veg Main Course' },
  { name:'Chicken Tikka Masala (Full)', price:319, category:'Non-Veg Main Course' },
  { name:'Kadai Chicken (Half)',        price:169, category:'Non-Veg Main Course' },
  { name:'Kadai Chicken (Full)',        price:309, category:'Non-Veg Main Course' },
  { name:'Chicken Do Pyaza (Half)',     price:169, category:'Non-Veg Main Course' },
  { name:'Chicken Do Pyaza (Full)',     price:309, category:'Non-Veg Main Course' },
  { name:'Chicken Kali Mirch (Half)',   price:169, category:'Non-Veg Main Course' },
  { name:'Chicken Kali Mirch (Full)',   price:309, category:'Non-Veg Main Course' },
  { name:'Chicken Handi (Half)',        price:169, category:'Non-Veg Main Course' },
  { name:'Chicken Handi (Full)',        price:309, category:'Non-Veg Main Course' },

  // Mutton Main Course
  { name:'Mutton Curry (Half)',    price:215, category:'Mutton Main Course' },
  { name:'Mutton Curry (Full)',    price:360, category:'Mutton Main Course' },
  { name:'Mutton Tawa Fry (Half)', price:215, category:'Mutton Main Course' },
  { name:'Mutton Tawa Fry (Full)', price:360, category:'Mutton Main Course' },
  { name:'Mutton Handi (Half)',    price:215, category:'Mutton Main Course' },
  { name:'Mutton Handi (Full)',    price:360, category:'Mutton Main Course' },

  // Rolls
  { name:'Vegetable Roll',          price:69,  category:'Rolls' },
  { name:'Vegetable Cheese Roll',   price:79,  category:'Rolls' },
  { name:'Paneer Masala Roll',      price:119, category:'Rolls' },
  { name:'Paneer Tikka Roll',       price:129, category:'Rolls' },
  { name:'Veg Khatti Roll',         price:130, category:'Rolls' },
  { name:'Egg Masala Roll',         price:59,  category:'Rolls' },
  { name:'Crispy Chicken',          price:79,  category:'Rolls' },
  { name:'Chicken Seekh Kebab Roll',price:99,  category:'Rolls' },
  { name:'Chicken Seekh & Egg Roll',price:109, category:'Rolls' },
  { name:'Chicken Tikka Roll',      price:119, category:'Rolls' },
  { name:'Butter Chicken Roll',     price:149, category:'Rolls' },
  { name:'Chicken Keema Roll',      price:179, category:'Rolls' },
  { name:'Chole Bhature',           price:70,  category:'Rolls' },

  // Bread
  { name:'Roti',                       price:15,  category:'Bread' },
  { name:'Butter Roti',                price:21,  category:'Bread' },
  { name:'Naan',                       price:31,  category:'Bread' },
  { name:'Butter Naan',                price:35,  category:'Bread' },
  { name:'Garlic Naan',                price:40,  category:'Bread' },
  { name:'Stuff Naan',                 price:40,  category:'Bread' },
  { name:'Laccha Paratha',             price:50,  category:'Bread' },
  { name:'Veg Choor Choor Paratha',    price:99,  category:'Bread' },
  { name:'Chicken Keema Paratha',      price:149, category:'Bread' },
  { name:'Chicken Choor Choor Paratha',price:159, category:'Bread' },

  // Rice
  { name:'Steam Rice (Half)', price:59,  category:'Rice' },
  { name:'Steam Rice (Full)', price:89,  category:'Rice' },
  { name:'Jeera Rice (Half)', price:69,  category:'Rice' },
  { name:'Jeera Rice (Full)', price:119, category:'Rice' },
  { name:'Veg Pulao',         price:159, category:'Rice' },

  // Sides
  { name:'Masala Papad',       price:59, category:'Sides' },
  { name:'Green Salad',        price:69, category:'Sides' },
  { name:'Mix / Boondi Raita', price:69, category:'Sides' },
  { name:'Pineapple Raita',    price:79, category:'Sides' },

  // Beverages
  { name:'Fresh Lime Soda',          price:79,  category:'Beverages' },
  { name:'Lemon Iced Tea',           price:89,  category:'Beverages' },
  { name:'Mint Mojito',              price:99,  category:'Beverages' },
  { name:'Classic Mojito',           price:129, category:'Beverages' },
  { name:'Blue Lagoon Mojito',       price:129, category:'Beverages' },
  { name:'Paan Mojito',              price:129, category:'Beverages' },
  { name:'Green Apple Mojito',       price:129, category:'Beverages' },
  { name:'Butter Milk',              price:59,  category:'Beverages' },
  { name:'Coke / Thums Up / Fanta',  price:49,  category:'Beverages' },
  { name:'Masala Tea',               price:39,  category:'Beverages' },
];

const menuCategories = [
  'Veg Biryani', 'Non-Veg Biryani', 'Mutton Biryani',
  'Veg Starters', 'Non-Veg Starters', 'Soup',
  'Veg Chinese', 'Non-Veg Chinese', 'Dal',
  'Veg Main Course', 'Non-Veg Main Course', 'Mutton Main Course',
  'Rolls', 'Bread', 'Rice', 'Sides', 'Beverages',
];

const restaurant = {
  name:          "Dom's Biryani",
  cuisine:       'Biryani',
  area:          'Paliganj',
  rating:        4.2,
  deliveryTime:  '20-30 min',
  deliveryTimeMin: 20,
  deliveryTimeMax: 30,
  image:         'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop',
  isOpen:        true,
  isActive:      true,
  menuItems,
  menuCategories,
  deliveryFee:   12,
  minOrderValue: 100,
  description:   'Famous for biryanis and kebabs in Paliganj',
  offers:        [{ title: '20% OFF on first order', code: 'FIRST20' }],
  cuisineTypes:  ['Biryani', 'Mughlai', 'North Indian'],
  totalRatings:  0,
  createdAt:     new Date(),
  updatedAt:     new Date(),
};

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  console.log('Connected to MongoDB');
  const col = client.db('snapit').collection('restaurants');
  const result = await col.insertOne(restaurant);
  console.log("✅ Dom's Biryani added with ID: " + result.insertedId);
  console.log('   ' + menuItems.length + ' menu items across ' + menuCategories.length + ' categories');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
