import { MongoClient, ObjectId } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const RESTAURANT_ID = new ObjectId('6a2c30d7159ffb6c46268d94');

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

  // Veg Main Course
  { name:'Palak Paneer',           price:210, category:'Veg Main Course' },
  { name:'Paneer Kadhai',          price:210, category:'Veg Main Course' },
  { name:'Mutter Paneer Masala',   price:210, category:'Veg Main Course' },
  { name:'Mutter Paneer',          price:210, category:'Veg Main Course' },
  { name:'Paneer Butter Masala',   price:225, category:'Veg Main Course' },
  { name:'Mix Vegetable',          price:189, category:'Veg Main Course' },
  { name:'Paneer Masala',          price:210, category:'Veg Main Course' },
  { name:'Paneer Handi',           price:210, category:'Veg Main Course' },
  { name:'Aloo Dum Kashmiri',      price:200, category:'Veg Main Course' },
  { name:'Aloo Gobhi Masala',      price:180, category:'Veg Main Course' },
  { name:'Mushroom Do Pyaza',      price:190, category:'Veg Main Course' },
  { name:'Mushroom Masala',        price:220, category:'Veg Main Course' },
  { name:'Mushroom Mutter Masala', price:210, category:'Veg Main Course' },
  { name:'Mushroom Kadhai',        price:220, category:'Veg Main Course' },
  { name:'Paneer Lababdar',        price:240, category:'Veg Main Course' },
  { name:'Paneer Punjabi',         price:260, category:'Veg Main Course' },
  { name:'Kaju Paneer Masala',     price:240, category:'Veg Main Course' },
  { name:'Kaju Butter Masala',     price:250, category:'Veg Main Course' },
  { name:'Malai Kofta',            price:190, category:'Veg Main Course' },
  { name:'Paneer Kofta',           price:280, category:'Veg Main Course' },
  { name:'Shahi Paneer',           price:260, category:'Veg Main Course' },
  { name:'Paneer Pasanda',         price:270, category:'Veg Main Course' },
  { name:'Mushroom Tikka Masala',  price:270, category:'Veg Main Course' },

  // Non-Veg Main Course
  { name:'Mutton Rogan Josh',     price:480, category:'Non-Veg Main Course' },
  { name:'Mutton Dehati',         price:550, category:'Non-Veg Main Course' },
  { name:'Mutton Curry',          price:350, category:'Non-Veg Main Course' },
  { name:'Chicken Butter Masala', price:300, category:'Non-Veg Main Course' },
  { name:'Chicken Dehati',        price:350, category:'Non-Veg Main Course' },
  { name:'Chicken Kadhai',        price:300, category:'Non-Veg Main Course' },
  { name:'Chicken Do Payaza',     price:240, category:'Non-Veg Main Course' },
  { name:'Punjabi Chicken Masala',price:350, category:'Non-Veg Main Course' },
  { name:'Chicken Kassa',         price:210, category:'Non-Veg Main Course' },
  { name:'Bhuna Chicken',         price:190, category:'Non-Veg Main Course' },
  { name:'Chicken Kali Mirch',    price:230, category:'Non-Veg Main Course' },
  { name:'Chicken Curry',         price:180, category:'Non-Veg Main Course' },
  { name:'Chicken Nawabi',        price:300, category:'Non-Veg Main Course' },
  { name:'Murg Musallam',         price:290, category:'Non-Veg Main Course' },
  { name:'Chicken Handi',         price:290, category:'Non-Veg Main Course' },
  { name:'Pali Fish Curry',       price:180, category:'Non-Veg Main Course' },
  { name:'Egg Do Pyaza',          price:110, category:'Non-Veg Main Course' },
  { name:'Egg Curry',             price:100, category:'Non-Veg Main Course' },
  { name:'Omelette Dehati Curry', price:110, category:'Non-Veg Main Course' },
  { name:'Rara Chicken',          price:350, category:'Non-Veg Main Course' },
  { name:'Chicken Angara',        price:350, category:'Non-Veg Main Course' },

  // Chinese
  { name:'Veg Hakka Noodles',     price:160, category:'Chinese' },
  { name:'Veg Chowmein',          price:120, category:'Chinese' },
  { name:'Chicken Chowmein',      price:160, category:'Chinese' },
  { name:'Chicken Hakka Noodles', price:175, category:'Chinese' },
  { name:'Chicken Fried Rice',    price:210, category:'Chinese' },
  { name:'Schezwan Chicken',      price:275, category:'Chinese' },
  { name:'Chicken & Pepper',      price:275, category:'Chinese' },
  { name:'Chicken Chilly Gravy',  price:275, category:'Chinese' },
  { name:'Mangolian Chicken',     price:299, category:'Chinese' },

  // Soup
  { name:'Hot & Sour Soup (Veg)',     price:110, category:'Soup' },
  { name:'Hot & Sour Soup (Non-Veg)', price:130, category:'Soup' },
  { name:'Sweet Corn Soup (Veg)',     price:110, category:'Soup' },
  { name:'Sweet Corn Soup (Non-Veg)', price:130, category:'Soup' },
  { name:'Manchow Soup (Veg)',        price:110, category:'Soup' },
  { name:'Manchow Soup (Non-Veg)',    price:125, category:'Soup' },
  { name:'Tomato Soup',               price:110, category:'Soup' },
  { name:'Lemon Coriander Soup',      price:110, category:'Soup' },
  { name:'Tomato Dhaniya Shorba',     price:115, category:'Soup' },

  // Desserts
  { name:'Gulab Jamun (2 pcs)',        price:45,  category:'Desserts' },
  { name:'Gulab Jamun with Ice Cream', price:90,  category:'Desserts' },
  { name:'Rasgullah (2 pcs)',          price:40,  category:'Desserts' },
  { name:'Keshari Rashmalai (2 pcs)',  price:110, category:'Desserts' },
  { name:'Ice Cream',                  price:90,  category:'Desserts' },

  // Beverages
  { name:'Mineral Water',   price:25, category:'Beverages' },
  { name:'Coke (200 ml)',   price:35, category:'Beverages' },
  { name:'Thums Up (200 ml)',price:35, category:'Beverages' },
  { name:'Sprite (200 ml)', price:35, category:'Beverages' },
  { name:'Mazza (200 ml)',  price:35, category:'Beverages' },

  // Mocktails
  { name:'Masala Cold Drinks', price:50,  category:'Mocktails' },
  { name:'Lassi',              price:60,  category:'Mocktails' },
  { name:'Fresh Lime Soda',    price:110, category:'Mocktails' },
  { name:'Blue Logan',         price:150, category:'Mocktails' },
  { name:'Virgin Mojito',      price:135, category:'Mocktails' },
  { name:'Mint Mojito',        price:135, category:'Mocktails' },
  { name:'Strawberry Crush',   price:160, category:'Mocktails' },
  { name:'Kachha Apple White', price:145, category:'Mocktails' },
  { name:'Kiwi Crush',         price:145, category:'Mocktails' },
  { name:'Cold Coffee',        price:110, category:'Mocktails' },

  // Hot Drinks
  { name:'Hot Coffee', price:40, category:'Hot Drinks' },
  { name:'Tea',        price:30, category:'Hot Drinks' },
  { name:'Masala Tea', price:35, category:'Hot Drinks' },
  { name:'Green Tea',  price:35, category:'Hot Drinks' },
];

const menuCategories = [
  'Veg Starter', 'Veg Main Course', 'Non-Veg Main Course',
  'Chinese', 'Soup', 'Desserts', 'Beverages', 'Mocktails', 'Hot Drinks',
];

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  console.log('Connected to MongoDB');
  const col = client.db('snapit').collection('restaurants');
  await col.updateOne(
    { _id: RESTAURANT_ID },
    { $set: { menuItems, menuCategories, updatedAt: new Date() } }
  );
  console.log('✅ Pali Paradise menu updated — ' + menuItems.length + ' items across ' + menuCategories.length + ' categories');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
