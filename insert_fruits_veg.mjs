import { MongoClient, ObjectId } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const CATEGORY_ID        = new ObjectId('69b5717fa8b9adccd30c61b6');
const SUBCATEGORY_FRUITS = new ObjectId('6a1ff5b759078167b7dc26ce');
const SUBCATEGORY_VEGS   = new ObjectId('6a1ff5b759078167b7dc26cf');
const STORE_NAME         = 'Fresh Fruits Shop';

const makeInventory = (stock) => [{ store_name: STORE_NAME, stock, isAvailable: true, _id: new ObjectId() }];

const toDoc = (item, subCatId) => ({
  _id: new ObjectId(), name: item.name, image: [],
  category: [CATEGORY_ID], subCategory: [subCatId],
  unit: item.unit, stock: item.stock, price: item.price,
  sellerPrice: item.sellerPrice, snapitMargin: item.snapitMargin,
  sellingPrice: item.price, discount: item.discount,
  description: `Fresh ${item.name} sourced daily. Available for 10-minute delivery in Paliganj.`,
  publish: true, store_inventory: makeInventory(item.stock),
  flashSale: { discountPercent: 0, isActive: false },
  variantGroup: '', createdAt: new Date(), updatedAt: new Date(), __v: 0,
});

const fruits = [
  { name:'Fresh Banana',          unit:'1 dozen', price:40,  sellerPrice:35,  snapitMargin:5,  discount:0, stock:50 },
  { name:'Fresh Apple (Shimla)',  unit:'1 kg',    price:120, sellerPrice:105, snapitMargin:15, discount:5, stock:30 },
  { name:'Fresh Mango',           unit:'1 kg',    price:80,  sellerPrice:70,  snapitMargin:10, discount:0, stock:40 },
  { name:'Fresh Papaya',          unit:'1 kg',    price:50,  sellerPrice:42,  snapitMargin:8,  discount:0, stock:25 },
  { name:'Fresh Watermelon',      unit:'1 pc',    price:60,  sellerPrice:50,  snapitMargin:10, discount:0, stock:20 },
  { name:'Fresh Guava',           unit:'500 gm',  price:30,  sellerPrice:25,  snapitMargin:5,  discount:0, stock:35 },
  { name:'Fresh Grapes (Green)',  unit:'500 gm',  price:60,  sellerPrice:52,  snapitMargin:8,  discount:5, stock:25 },
  { name:'Fresh Lemon',           unit:'6 pcs',   price:20,  sellerPrice:16,  snapitMargin:4,  discount:0, stock:60 },
  { name:'Fresh Pomegranate',     unit:'1 pc',    price:50,  sellerPrice:42,  snapitMargin:8,  discount:0, stock:20 },
  { name:'Fresh Pineapple',       unit:'1 pc',    price:70,  sellerPrice:60,  snapitMargin:10, discount:0, stock:15 },
  { name:'Fresh Coconut',         unit:'1 pc',    price:35,  sellerPrice:28,  snapitMargin:7,  discount:0, stock:30 },
  { name:'Fresh Orange',          unit:'4 pcs',   price:40,  sellerPrice:33,  snapitMargin:7,  discount:0, stock:30 },
  { name:'Fresh Pear',            unit:'500 gm',  price:55,  sellerPrice:47,  snapitMargin:8,  discount:0, stock:20 },
  { name:'Fresh Kiwi',            unit:'3 pcs',   price:60,  sellerPrice:50,  snapitMargin:10, discount:0, stock:15 },
  { name:'Fresh Chiku (Sapota)',  unit:'500 gm',  price:35,  sellerPrice:28,  snapitMargin:7,  discount:0, stock:25 },
];

const vegetables = [
  { name:'Fresh Tomato',                  unit:'500 gm', price:20, sellerPrice:16, snapitMargin:4, discount:0, stock:60 },
  { name:'Fresh Potato (Aloo)',           unit:'1 kg',   price:25, sellerPrice:20, snapitMargin:5, discount:0, stock:80 },
  { name:'Fresh Onion (Pyaz)',            unit:'1 kg',   price:30, sellerPrice:24, snapitMargin:6, discount:0, stock:70 },
  { name:'Fresh Cauliflower',             unit:'1 pc',   price:25, sellerPrice:20, snapitMargin:5, discount:0, stock:30 },
  { name:'Fresh Cabbage',                 unit:'1 pc',   price:20, sellerPrice:16, snapitMargin:4, discount:0, stock:30 },
  { name:'Fresh Carrot (Gajar)',          unit:'500 gm', price:25, sellerPrice:20, snapitMargin:5, discount:0, stock:40 },
  { name:'Fresh Spinach (Palak)',         unit:'250 gm', price:15, sellerPrice:12, snapitMargin:3, discount:0, stock:40 },
  { name:'Fresh Bitter Gourd (Karela)',   unit:'500 gm', price:30, sellerPrice:24, snapitMargin:6, discount:0, stock:25 },
  { name:'Fresh Bottle Gourd (Lauki)',    unit:'1 pc',   price:20, sellerPrice:15, snapitMargin:5, discount:0, stock:30 },
  { name:'Fresh Cucumber (Kheera)',       unit:'500 gm', price:20, sellerPrice:15, snapitMargin:5, discount:0, stock:35 },
  { name:'Fresh Lady Finger (Bhindi)',    unit:'500 gm', price:25, sellerPrice:20, snapitMargin:5, discount:0, stock:30 },
  { name:'Fresh Green Peas (Matar)',      unit:'500 gm', price:40, sellerPrice:33, snapitMargin:7, discount:0, stock:25 },
  { name:'Fresh Brinjal (Baingan)',       unit:'500 gm', price:20, sellerPrice:15, snapitMargin:5, discount:0, stock:30 },
  { name:'Fresh Capsicum (Shimla Mirch)', unit:'250 gm', price:25, sellerPrice:20, snapitMargin:5, discount:0, stock:25 },
  { name:'Fresh Garlic (Lehsun)',         unit:'100 gm', price:20, sellerPrice:16, snapitMargin:4, discount:0, stock:50 },
  { name:'Fresh Ginger (Adrak)',          unit:'100 gm', price:15, sellerPrice:12, snapitMargin:3, discount:0, stock:50 },
  { name:'Fresh Green Chilli (Mirchi)',   unit:'100 gm', price:10, sellerPrice:8,  snapitMargin:2, discount:0, stock:60 },
];

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  console.log('Connected to MongoDB');
  const col = client.db('snapit').collection('products');
  const docs = [
    ...fruits.map(f => toDoc(f, SUBCATEGORY_FRUITS)),
    ...vegetables.map(v => toDoc(v, SUBCATEGORY_VEGS)),
  ];
  const result = await col.insertMany(docs);
  console.log(`✅ Inserted ${result.insertedCount} products into Fresh Fruits Shop`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
