import { MongoClient, ObjectId } from 'mongodb';

const uri = 'REDACTED_MONGO_URI';

const CAT_MEAT        = new ObjectId('69b57104a8b9adccd30c61ad');
const CAT_EGGS        = new ObjectId('69b57164a8b9adccd30c61b3');
const SUB_CHICKEN     = new ObjectId('69b6d312dadc7adc316f81c5');
const SUB_FISH        = new ObjectId('69b6d38cdadc7adc316f81d9');
const SUB_EGGS        = new ObjectId('6a1feebe6903b8e34dbf2904');
const STORE_NAME      = 'Egg Shop';

const makeInventory = (stock) => [{ store_name: STORE_NAME, stock, isAvailable: true, _id: new ObjectId() }];

const toDoc = (item, catId, subCatId) => ({
  _id: new ObjectId(), name: item.name, image: [item.image],
  category: [catId], subCategory: [subCatId],
  unit: item.unit, stock: item.stock, price: item.price,
  sellerPrice: item.sellerPrice, snapitMargin: item.snapitMargin,
  sellingPrice: item.price, discount: item.discount,
  description: item.description,
  publish: true, store_inventory: makeInventory(item.stock),
  flashSale: { discountPercent: 0, isActive: false },
  variantGroup: '', createdAt: new Date(), updatedAt: new Date(), __v: 0,
});

const eggs = [
  { name:'Farm Fresh Eggs (White)', unit:'6 pcs',  price:36, sellerPrice:30, snapitMargin:6, discount:0, stock:100, description:'Fresh white eggs sourced daily from local farms.', image:'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400' },
  { name:'Farm Fresh Eggs (Brown)', unit:'6 pcs',  price:42, sellerPrice:35, snapitMargin:7, discount:0, stock:80,  description:'Fresh brown eggs sourced daily from local farms.', image:'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400' },
  { name:'Farm Fresh Eggs (White)', unit:'12 pcs', price:70, sellerPrice:58, snapitMargin:12, discount:0, stock:60, description:'Fresh white eggs sourced daily from local farms.', image:'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400' },
  { name:'Farm Fresh Eggs (Brown)', unit:'12 pcs', price:80, sellerPrice:67, snapitMargin:13, discount:0, stock:50, description:'Fresh brown eggs sourced daily from local farms.', image:'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400' },
  { name:'Desi Eggs',               unit:'6 pcs',  price:50, sellerPrice:42, snapitMargin:8, discount:0, stock:40,  description:'Country desi eggs — rich yolk, high nutrition.', image:'https://images.unsplash.com/photo-1569288063643-5d29ad64df09?w=400' },
];

const chicken = [
  { name:'Broiler Chicken (Whole)', unit:'1 kg',   price:160, sellerPrice:140, snapitMargin:20, discount:0, stock:20, description:'Fresh broiler chicken cleaned and ready to cook.', image:'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400' },
  { name:'Chicken Breast',          unit:'500 gm', price:120, sellerPrice:105, snapitMargin:15, discount:0, stock:25, description:'Fresh boneless chicken breast pieces.', image:'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400' },
  { name:'Chicken Curry Cut',       unit:'500 gm', price:100, sellerPrice:88,  snapitMargin:12, discount:0, stock:30, description:'Freshly cut chicken pieces ready for curry.', image:'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400' },
  { name:'Chicken Legs (Drumstick)',unit:'4 pcs',  price:120, sellerPrice:105, snapitMargin:15, discount:0, stock:20, description:'Fresh chicken drumsticks, perfect for grilling.', image:'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400' },
  { name:'Desi Murgi (Country Chicken)', unit:'1 kg', price:350, sellerPrice:310, snapitMargin:40, discount:0, stock:10, description:'Fresh desi country chicken from local farms.', image:'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=400' },
];

const fish = [
  { name:'Rohu Fish',     unit:'500 gm', price:80,  sellerPrice:68,  snapitMargin:12, discount:0, stock:20, description:'Fresh Rohu fish, cleaned and cut.', image:'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400' },
  { name:'Catla Fish',    unit:'500 gm', price:90,  sellerPrice:78,  snapitMargin:12, discount:0, stock:15, description:'Fresh Catla fish, cleaned and cut.', image:'https://images.unsplash.com/photo-1571167366136-b57e03e4d4e4?w=400' },
  { name:'Hilsa Fish',    unit:'500 gm', price:200, sellerPrice:175, snapitMargin:25, discount:0, stock:10, description:'Fresh Hilsa (Ilish) fish — premium quality.', image:'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400' },
  { name:'Prawns',        unit:'250 gm', price:120, sellerPrice:105, snapitMargin:15, discount:0, stock:15, description:'Fresh prawns cleaned and deveined.', image:'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400' },
  { name:'Singi Fish',    unit:'500 gm', price:100, sellerPrice:88,  snapitMargin:12, discount:0, stock:12, description:'Fresh Singi (Stinging catfish) — local favourite.', image:'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400' },
];

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  console.log('Connected to MongoDB');
  const col = client.db('snapit').collection('products');

  const docs = [
    ...eggs.map(e    => toDoc(e, CAT_EGGS, SUB_EGGS)),
    ...chicken.map(c => toDoc(c, CAT_MEAT, SUB_CHICKEN)),
    ...fish.map(f    => toDoc(f, CAT_MEAT, SUB_FISH)),
  ];

  const result = await col.insertMany(docs);
  console.log('✅ Inserted ' + result.insertedCount + ' products into Egg Shop');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
