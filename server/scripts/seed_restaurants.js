import 'dotenv/config'
import mongoose from 'mongoose'
import RestaurantModel from '../models/restaurant.model.js'
import MenuItemModel from '../models/MenuItem.model.js'

// High-quality relevant food image maps
const IMAGES = {
  // Restaurant Covers
  afra_tafri_cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
  afra_tafri_logo: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=300&auto=format&fit=crop',
  rj_garden_cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
  rj_garden_logo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=300&auto=format&fit=crop',

  // Rolls & Fast Food
  veg_roll: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop',
  paneer_roll: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop',
  egg_roll: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop',
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop',
  chowmin_veg: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop',
  chowmin_nonveg: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop',
  manchurian: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=500&auto=format&fit=crop',
  chilli_paneer: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop',
  chilli_chicken: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop',
  fried_rice: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop',
  laccha_paratha: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
  combo: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop',

  // Beverages & Mocktails
  masala_drink: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop',
  lassi: 'https://images.unsplash.com/photo-1571006682878-a461b626c92d?w=500&auto=format&fit=crop',
  fresh_lime: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop',
  mint_mojito: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop',
  cold_coffee: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop',
  tea_hot: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop',
  coffee_hot: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop',

  // Soups
  soup_veg: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop',
  soup_nonveg: 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=500&auto=format&fit=crop',

  // Starters
  paneer_tikka: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop',
  veg_kabab: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop',
  veg_platter: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop',
  chicken_tikka: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop',
  tandoori_chicken: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop',
  chicken_lollypop: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop',
  fish_tikka: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop',

  // Main Course
  paneer_curry: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop',
  veg_curry: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop',
  kofta_curry: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop',
  chicken_curry: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop',
  butter_chicken: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop',
  egg_curry: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop',

  // Breads & Rice
  naan_roti: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
  biryani_veg: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop',
  biryani_chicken: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop',
  salad_raita: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop',
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. RESTAURANT 1: Afra Tafri Fast Food
  // ═══════════════════════════════════════════════════════════════════════════
  const afraData = {
    name: 'Afra Tafri Fast Food',
    description: 'Authentic street food, spicy rolls, dosas, chowmein & crispy combos',
    image: IMAGES.afra_tafri_cover,
    logo: IMAGES.afra_tafri_logo,
    cuisineTypes: ['Street Food', 'Fast Food', 'Rolls', 'Chinese', 'Dosa'],
    menuCategories: ['Rolls', 'Dosa', 'Chowmin', 'Manchurian', 'Chilli', 'Fried Rice', 'Combos'],
    tags: ['bestseller', 'trending'],
    isOpen: true,
    isActive: true,
    isPureVeg: false,
    rating: 4.6,
    totalRatings: 184,
    deliveryTimeMin: 15,
    deliveryTimeMax: 30,
    deliveryFee: 0,
    minOrderValue: 50,
    offers: ['10-Min Fast Preparation', 'Free Delivery on Orders Above ₹149'],
    opensAt: '9:00 AM',
    address: {
      street: 'Main Bazaar',
      area: 'Main Market',
      city: 'Paliganj',
      pincode: '801110',
    },
    location: {
      lat: 25.33121156659458,
      lng: 84.8006737574818,
    },
  }

  let afra = await RestaurantModel.findOne({ name: 'Afra Tafri Fast Food' })
  if (!afra) {
    afra = await RestaurantModel.create(afraData)
    console.log('Created restaurant: Afra Tafri Fast Food', afra._id)
  } else {
    Object.assign(afra, afraData)
    await afra.save()
    console.log('Updated restaurant: Afra Tafri Fast Food', afra._id)
  }

  // Clear existing items for Afra Tafri to prevent duplicate accumulation
  await MenuItemModel.deleteMany({ restaurantId: afra._id })

  const afraMenuItems = [
    // 🌯 Rolls
    { name: 'Veg Roll', category: 'Rolls', price: 30, isVeg: true, image: IMAGES.veg_roll, description: 'Crispy wrap loaded with seasoned vegetables and tangy sauces' },
    { name: 'Paneer Roll', category: 'Rolls', price: 60, isVeg: true, image: IMAGES.paneer_roll, isBestseller: true, description: 'Fresh paneer cubes tossed in spices and wrapped in golden paratha' },
    { name: 'Single Egg Roll', category: 'Rolls', price: 35, isVeg: false, image: IMAGES.egg_roll, description: 'Single egg coated paratha with onion, cucumber and special sauces' },
    { name: 'Double Egg Roll', category: 'Rolls', price: 40, isVeg: false, image: IMAGES.egg_roll, isBestseller: true, description: 'Double egg layered paratha with crunch salad and spicy chutney' },

    // 🥞 Dosa
    { name: 'Masala Dosa', category: 'Dosa', price: 50, isVeg: true, image: IMAGES.dosa, isBestseller: true, description: 'Crispy golden crepe with spiced potato masala, sambar & chutney' },
    { name: 'Paneer Dosa', category: 'Dosa', price: 80, isVeg: true, image: IMAGES.dosa, description: 'Stuffed with richly grated paneer masala, served hot' },

    // 🍜 Chowmin
    { name: 'Veg Chowmin (Half)', category: 'Chowmin', price: 30, isVeg: true, image: IMAGES.chowmin_veg, description: 'Wok-tossed noodles with crunchy seasonal vegetables (Half portion)' },
    { name: 'Veg Chowmin (Full)', category: 'Chowmin', price: 60, isVeg: true, image: IMAGES.chowmin_veg, isBestseller: true, description: 'Full plate wok-tossed noodles with crunchy seasonal vegetables' },
    { name: 'Egg Chowmin (Half)', category: 'Chowmin', price: 40, isVeg: false, image: IMAGES.chowmin_nonveg, description: 'Scrambled eggs tossed with spiced noodles (Half portion)' },
    { name: 'Egg Chowmin (Full)', category: 'Chowmin', price: 80, isVeg: false, image: IMAGES.chowmin_nonveg, description: 'Double egg tossed noodles with authentic spices (Full portion)' },
    { name: 'Chicken Chowmin (Half)', category: 'Chowmin', price: 60, isVeg: false, image: IMAGES.chowmin_nonveg, description: 'Tender chicken shreds tossed with noodles & peppers (Half portion)' },
    { name: 'Chicken Chowmin (Full)', category: 'Chowmin', price: 120, isVeg: false, image: IMAGES.chowmin_nonveg, isBestseller: true, description: 'Full plate loaded with seasoned chicken chunks & fiery noodles' },

    // 🥘 Manchurian
    { name: 'Veg Manchurian (Half)', category: 'Manchurian', price: 40, isVeg: true, image: IMAGES.manchurian, description: 'Crispy veg dumplings in savory ginger-garlic sauce (Half)' },
    { name: 'Veg Manchurian (Full)', category: 'Manchurian', price: 80, isVeg: true, image: IMAGES.manchurian, isBestseller: true, description: 'Classic Indo-Chinese vegetable balls in tangy gravy (Full)' },

    // 🌶️ Chilli
    { name: 'Paneer Chilli (Half)', category: 'Chilli', price: 60, isVeg: true, image: IMAGES.chilli_paneer, description: 'Fresh paneer tossed with capsicum, onion and soy chilli sauce (Half)' },
    { name: 'Paneer Chilli (Full)', category: 'Chilli', price: 120, isVeg: true, image: IMAGES.chilli_paneer, isBestseller: true, description: 'Signature paneer chilli with hot garlic glaze (Full)' },
    { name: 'Chicken Chilli (Half)', category: 'Chilli', price: 60, isVeg: false, image: IMAGES.chilli_chicken, description: 'Boneless chicken tossed in spicy Indo-Chinese chilli sauce (Half)' },
    { name: 'Chicken Chilli (Full)', category: 'Chilli', price: 120, isVeg: false, image: IMAGES.chilli_chicken, isBestseller: true, description: 'Crispy fried chicken wok-tossed with green chillies & bell peppers (Full)' },

    // 🍚 Fried Rice
    { name: 'Fried Rice (Half)', category: 'Fried Rice', price: 50, isVeg: true, image: IMAGES.fried_rice, description: 'Aromatic basmati rice tossed with fresh veggies & soy sauce (Half)' },
    { name: 'Fried Rice (Full)', category: 'Fried Rice', price: 100, isVeg: true, image: IMAGES.fried_rice, description: 'Classic wok-tossed vegetable fried rice (Full)' },
    { name: 'Paneer Fried Rice (Half)', category: 'Fried Rice', price: 70, isVeg: true, image: IMAGES.fried_rice, description: 'Tender paneer cubes fried rice (Half)' },
    { name: 'Paneer Fried Rice (Full)', category: 'Fried Rice', price: 130, isVeg: true, image: IMAGES.fried_rice, description: 'Flavorful fried rice loaded with spiced paneer cubes (Full)' },
    { name: 'Egg Fried Rice (Full)', category: 'Fried Rice', price: 120, isVeg: false, image: IMAGES.fried_rice, description: 'Egg fried rice prepared with fresh spring onions (Full)' },
    { name: 'Chicken Fried Rice (Half)', category: 'Fried Rice', price: 70, isVeg: false, image: IMAGES.fried_rice, description: 'Juicy chicken fried rice (Half)' },
    { name: 'Chicken Fried Rice (Full)', category: 'Fried Rice', price: 140, isVeg: false, image: IMAGES.fried_rice, isBestseller: true, description: 'Chef special chicken fried rice with aromatic herbs (Full)' },

    // 🍽️ Combo Items
    { name: 'Veg Manchurian + 2 Laccha Paratha', category: 'Combos', price: 80, isVeg: true, image: IMAGES.combo, isBestseller: true, description: 'Delicious Veg Manchurian served with 2 crispy layered Laccha Parathas' },
    { name: 'Paneer Chilli + 2 Laccha Paratha', category: 'Combos', price: 100, isVeg: true, image: IMAGES.combo, isBestseller: true, description: 'Hot Paneer Chilli paired with 2 buttery Laccha Parathas' },
    { name: 'Chicken Chilli + Paratha', category: 'Combos', price: 100, isVeg: false, image: IMAGES.combo, isBestseller: true, description: 'Spicy Chicken Chilli served with fresh hot Paratha' },
    { name: 'Chicken + Veg Chowmin', category: 'Combos', price: 100, isVeg: false, image: IMAGES.combo, isBestseller: true, description: 'Best value combo of Chilli Chicken with Veg Chowmein' },
    { name: 'Laccha Paratha', category: 'Combos', price: 20, isVeg: true, image: IMAGES.laccha_paratha, description: 'Crispy, multi-layered tandoori laccha paratha (1 piece)' },
  ]

  for (const item of afraMenuItems) {
    await MenuItemModel.create({
      ...item,
      restaurantId: afra._id,
      isAvailable: true,
    })
  }
  console.log(`Seeded ${afraMenuItems.length} menu items for Afra Tafri Fast Food`)


  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RESTAURANT 2: RJ garden
  // ═══════════════════════════════════════════════════════════════════════════
  const rjData = {
    name: 'RJ garden',
    description: 'Fine dining garden restaurant · Tandoori starters, rich curries, mocktails & breads',
    image: IMAGES.rj_garden_cover,
    logo: IMAGES.rj_garden_logo,
    cuisineTypes: ['North Indian', 'Chinese', 'Mughlai', 'Tandoor', 'Beverages'],
    menuCategories: [
      'Mocktails / Beverages',
      'Soup',
      'Veg Starter',
      'Non-Veg Starter',
      'Noodles',
      'Veg Main Course',
      'Non-Veg Main Course',
      'Salad & Raita',
      'Rice',
      'Breads',
      'Kuchh Garam Ho Jaye',
    ],
    tags: ['bestseller', 'trending'],
    isOpen: true,
    isActive: true,
    isPureVeg: false,
    rating: 4.8,
    totalRatings: 310,
    deliveryTimeMin: 20,
    deliveryTimeMax: 40,
    deliveryFee: 0,
    minOrderValue: 100,
    offers: ['15% OFF on orders above ₹299', 'Complimentary Mint Chutney & Salad'],
    opensAt: '9:00 AM',
    address: {
      street: 'Near Bypass Road',
      area: 'Paliganj',
      city: 'Paliganj',
      pincode: '801110',
    },
    location: {
      lat: 25.33251156659458,
      lng: 84.8026737574818,
    },
  }

  let rj = await RestaurantModel.findOne({ name: { $regex: /^RJ\s*garden/i } })
  if (!rj) {
    rj = await RestaurantModel.create(rjData)
    console.log('Created restaurant: RJ garden', rj._id)
  } else {
    Object.assign(rj, rjData)
    await rj.save()
    console.log('Updated restaurant: RJ garden', rj._id)
  }

  // Clear existing items for RJ garden to prevent duplicates
  await MenuItemModel.deleteMany({ restaurantId: rj._id })

  const rjMenuItems = [
    // 🍹 Mocktails / Beverages
    { name: 'Masala Cold Drink', category: 'Mocktails / Beverages', price: 50, isVeg: true, image: IMAGES.masala_drink, description: 'Chilled soda infused with roasted cumin, chaat masala & fresh lemon' },
    { name: 'Lassi', category: 'Mocktails / Beverages', price: 60, isVeg: true, image: IMAGES.lassi, isBestseller: true, description: 'Thick sweet Punjabi yogurt lassi topped with malai' },
    { name: 'Fresh Lime Soda', category: 'Mocktails / Beverages', price: 110, isVeg: true, image: IMAGES.fresh_lime, description: 'Refreshing sparkling lime soda (Sweet / Salted)' },
    { name: 'Mint Mojito', category: 'Mocktails / Beverages', price: 135, isVeg: true, image: IMAGES.mint_mojito, isBestseller: true, description: 'Fresh crushed mint leaves, lime wedges, sprite and crushed ice' },
    { name: 'Cold Coffee', category: 'Mocktails / Beverages', price: 110, isVeg: true, image: IMAGES.cold_coffee, isBestseller: true, description: 'Rich blended creamy cold coffee with chocolate drizzle' },

    // 🍲 Soup
    { name: 'Manchow Soup (Veg)', category: 'Soup', price: 110, isVeg: true, image: IMAGES.soup_veg, description: 'Spicy and tangy Chinese vegetable broth with crispy fried noodles' },
    { name: 'Manchow Soup (Non-Veg)', category: 'Soup', price: 130, isVeg: false, image: IMAGES.soup_nonveg, isBestseller: true, description: 'Hearty chicken broth with egg drops and fried noodles' },
    { name: 'Sweet Corn Soup (Veg)', category: 'Soup', price: 110, isVeg: true, image: IMAGES.soup_veg, description: 'Mild and soothing sweet corn soup with garden vegetables' },
    { name: 'Sweet Corn Soup (Non-Veg)', category: 'Soup', price: 130, isVeg: false, image: IMAGES.soup_nonveg, description: 'Classic sweet corn soup with tender chicken bits' },
    { name: 'Hot & Sour Soup (Veg)', category: 'Soup', price: 110, isVeg: true, image: IMAGES.soup_veg, description: 'Spicy pepper and vinegar flavored vegetable soup' },
    { name: 'Hot & Sour Soup (Non-Veg)', category: 'Soup', price: 130, isVeg: false, image: IMAGES.soup_nonveg, description: 'Spicy pepper chicken soup with mushrooms and bamboo shoots' },
    { name: 'Tomato Soup', category: 'Soup', price: 110, isVeg: true, image: IMAGES.soup_veg, description: 'Silky ripe tomato soup served with crunchy croutons' },

    // 🥗 Veg Appetizer / Starter
    { name: 'Paneer Tikka – 6 pcs', category: 'Veg Starter', price: 235, isVeg: true, image: IMAGES.paneer_tikka, isBestseller: true, description: 'Charcoal-grilled cottage cheese cubes marinated in tandoori spices (6 pcs)' },
    { name: 'Dil Khus Paneer Tikka', category: 'Veg Starter', price: 249, isVeg: true, image: IMAGES.paneer_tikka, description: 'Chef special stuffed paneer tikka with mint-cashew blend' },
    { name: 'Hara Kabab', category: 'Veg Starter', price: 139, isVeg: true, image: IMAGES.veg_kabab, description: 'Pan-seared spinach, green peas and cottage cheese patties' },
    { name: 'Vegetarian Platter', category: 'Veg Starter', price: 449, isVeg: true, image: IMAGES.veg_platter, isBestseller: true, description: 'Grand assortment of Paneer Tikka, Hara Kabab, Veg Manchurian & Chilly Baby Corn' },
    { name: 'Chilli Mushroom', category: 'Veg Starter', price: 220, isVeg: true, image: IMAGES.chilli_paneer, description: 'Fresh button mushrooms tossed in spicy oriental sauce' },
    { name: 'Chilli Paneer', category: 'Veg Starter', price: 249, isVeg: true, image: IMAGES.chilli_paneer, isBestseller: true, description: 'Crispy paneer chunks wok-tossed with capsicum & hot garlic glaze' },
    { name: 'Crispy Baby Corn', category: 'Veg Starter', price: 239, isVeg: true, image: IMAGES.chilli_paneer, description: 'Golden fried crunchy baby corn tossed in sweet and spicy sauce' },
    { name: 'Veg Manchurian', category: 'Veg Starter', price: 239, isVeg: true, image: IMAGES.manchurian, description: 'Indo-Chinese veg dumplings served in semi-dry gravy' },
    { name: 'Paneer 65', category: 'Veg Starter', price: 249, isVeg: true, image: IMAGES.paneer_tikka, description: 'South Indian style spicy deep fried paneer with curry leaves' },

    // 🍗 Non-Veg Starter
    { name: 'Chicken Malai Tikka', category: 'Non-Veg Starter', price: 299, isVeg: false, image: IMAGES.chicken_tikka, isBestseller: true, description: 'Boneless chicken marinated in cream, cheese & green cardamom' },
    { name: 'Tandoori Lollipop', category: 'Non-Veg Starter', price: 399, isVeg: false, image: IMAGES.chicken_lollypop, isBestseller: true, description: 'Tandoor-roasted spiced chicken wings served with mint chutney' },
    { name: 'Chicken 65', category: 'Non-Veg Starter', price: 269, isVeg: false, image: IMAGES.chicken_lollypop, description: 'Fiery deep-fried chicken tossed with red chillies & mustard seeds' },
    { name: 'Tandoori Chicken (Half)', category: 'Non-Veg Starter', price: 299, isVeg: false, image: IMAGES.tandoori_chicken, description: 'Classic clay-oven roasted half chicken with tandoori spices' },
    { name: 'Tandoori Chicken (Full)', category: 'Non-Veg Starter', price: 499, isVeg: false, image: IMAGES.tandoori_chicken, isBestseller: true, description: 'Whole chicken marinated in yogurt and charred to perfection' },
    { name: 'Chicken Spring Roll', category: 'Non-Veg Starter', price: 249, isVeg: false, image: IMAGES.veg_roll, description: 'Crispy fried rolls stuffed with seasoned chicken and vegetables' },
    { name: 'Fish Tikka', category: 'Non-Veg Starter', price: 335, isVeg: false, image: IMAGES.fish_tikka, description: 'Juicy boneless fish fillet cubes grilled in clay tandoor' },
    { name: 'Drums of Heaven', category: 'Non-Veg Starter', price: 299, isVeg: false, image: IMAGES.chicken_lollypop, isBestseller: true, description: 'Crispy chicken lollipops coated with sweet spicy schezwan glaze' },
    { name: 'Chilli Chicken (Bone)', category: 'Non-Veg Starter', price: 215, isVeg: false, image: IMAGES.chilli_chicken, description: 'Traditional bone-in chicken tossed in spicy soy-chilli gravy' },
    { name: 'Chilli Chicken (Boneless)', category: 'Non-Veg Starter', price: 235, isVeg: false, image: IMAGES.chilli_chicken, isBestseller: true, description: 'Tender boneless chicken breast cubes in authentic chilli sauce' },
    { name: 'Chicken Drumsticks', category: 'Non-Veg Starter', price: 249, isVeg: false, image: IMAGES.chicken_lollypop, description: 'Succulent fried chicken leg drumsticks with dipping sauce' },
    { name: 'Chicken Lollypop', category: 'Non-Veg Starter', price: 299, isVeg: false, image: IMAGES.chicken_lollypop, description: 'Crispy crumb-coated chicken wings served with hot garlic dip' },
    { name: 'Fish Chilly Dry', category: 'Non-Veg Starter', price: 350, isVeg: false, image: IMAGES.fish_tikka, description: 'Crispy fish fillets tossed with spring onions & capsicum' },

    // 🍜 Noodles
    { name: 'Hakka Noodles', category: 'Noodles', price: 150, isVeg: true, image: IMAGES.chowmin_veg, isBestseller: true, description: 'Stir-fried noodles with crunchy cabbage, capsicum & carrots' },
    { name: 'Pan Fry Noodles', category: 'Noodles', price: 135, isVeg: true, image: IMAGES.chowmin_veg, description: 'Crispy pan-fried noodles topped with rich vegetable sauce' },
    { name: 'Noodles', category: 'Noodles', price: 110, isVeg: true, image: IMAGES.chowmin_veg, description: 'Classic street style wok-tossed vegetable noodles' },

    // 🥘 Veg Main Course
    { name: 'Paneer Butter Masala', category: 'Veg Main Course', price: 220, isVeg: true, image: IMAGES.paneer_curry, isBestseller: true, description: 'Cottage cheese in rich, creamy tomato and butter gravy' },
    { name: 'Paneer Dhaniya Adraki', category: 'Veg Main Course', price: 239, isVeg: true, image: IMAGES.paneer_curry, description: 'Paneer cooked in fresh coriander and ginger gravy' },
    { name: 'Palak Paneer', category: 'Veg Main Course', price: 205, isVeg: true, image: IMAGES.paneer_curry, description: 'Soft paneer cubes in smooth, spiced spinach puree' },
    { name: 'Paneer Lababdar', category: 'Veg Main Course', price: 235, isVeg: true, image: IMAGES.paneer_curry, isBestseller: true, description: 'Melt-in-mouth paneer in rich onion-tomato-cashew gravy' },
    { name: 'Paneer Kadhai', category: 'Veg Main Course', price: 209, isVeg: true, image: IMAGES.paneer_curry, description: 'Paneer tossed with freshly pounded kadhai spices & bell peppers' },
    { name: 'Paneer Handi', category: 'Veg Main Course', price: 209, isVeg: true, image: IMAGES.paneer_curry, description: 'Slow-cooked paneer in earthen handi style aromatic sauce' },
    { name: 'Paneer Dehati', category: 'Veg Main Course', price: 449, isVeg: true, image: IMAGES.paneer_curry, description: 'Rustic village-style spicy gravy with whole garlic and red chillies' },
    { name: 'Paneer Kofta', category: 'Veg Main Course', price: 279, isVeg: true, image: IMAGES.kofta_curry, description: 'Paneer stuffed vegetable dumplings in creamy golden gravy' },
    { name: 'Shahi Paneer', category: 'Veg Main Course', price: 259, isVeg: true, image: IMAGES.paneer_curry, description: 'Royal Mughlai style paneer cooked in white cashew-nut gravy' },
    { name: 'Mix Veg', category: 'Veg Main Course', price: 199, isVeg: true, image: IMAGES.veg_curry, description: 'Assorted seasonal fresh vegetables in spiced masala gravy' },
    { name: 'Veg Kofta Curry', category: 'Veg Main Course', price: 299, isVeg: true, image: IMAGES.kofta_curry, description: 'Crispy vegetable dumplings simmered in rich spiced curry' },
    { name: 'Malai Kofta', category: 'Veg Main Course', price: 189, isVeg: true, image: IMAGES.kofta_curry, isBestseller: true, description: 'Soft paneer and potato dumplings in sweet & mild creamy gravy' },
    { name: 'Dum Aloo Kashmiri', category: 'Veg Main Course', price: 199, isVeg: true, image: IMAGES.veg_curry, description: 'Stuffed baby potatoes slow-cooked in Kashmiri red gravy' },
    { name: 'Sabji Rangbirangi', category: 'Veg Main Course', price: 249, isVeg: true, image: IMAGES.veg_curry, description: 'Colorful medley of garden veggies cooked in butter sauce' },
    { name: 'Mushroom Masala', category: 'Veg Main Course', price: 215, isVeg: true, image: IMAGES.veg_curry, description: 'Tender mushrooms simmered in thick onion-tomato gravy' },
    { name: 'Mushroom Do Payaza', category: 'Veg Main Course', price: 199, isVeg: true, image: IMAGES.veg_curry, description: 'Mushrooms cooked with diced crunchy onions and roasted spices' },
    { name: 'Mushroom Butter Masala', category: 'Veg Main Course', price: 215, isVeg: true, image: IMAGES.veg_curry, description: 'Rich and buttery mushroom curry with cream drizzle' },

    // 🍗 Non-Veg Main Course
    { name: 'Chicken Boti Masala', category: 'Non-Veg Main Course', price: 299, isVeg: false, image: IMAGES.chicken_curry, isBestseller: true, description: 'Boneless chicken cubes cooked in thick semi-dry masala gravy' },
    { name: 'Murg Tikka Lababdar', category: 'Non-Veg Main Course', price: 399, isVeg: false, image: IMAGES.chicken_curry, isBestseller: true, description: 'Tandoori chicken tikka pieces simmered in silky lababdar gravy' },
    { name: 'Chicken Butter', category: 'Non-Veg Main Course', price: 269, isVeg: false, image: IMAGES.butter_chicken, isBestseller: true, description: 'Classic buttery tomato gravy with tender roasted chicken' },
    { name: 'Chicken Dehati (Half)', category: 'Non-Veg Main Course', price: 299, isVeg: false, image: IMAGES.chicken_curry, description: 'Authentic Bihari/Bhojpuri style desi chicken with whole garlic (Half)' },
    { name: 'Chicken Dehati (Full)', category: 'Non-Veg Main Course', price: 499, isVeg: false, image: IMAGES.chicken_curry, isBestseller: true, description: 'Whole country-style chicken cooked in mustard oil & rustic spices (Full)' },
    { name: 'Chicken Kadhai (Half)', category: 'Non-Veg Main Course', price: 249, isVeg: false, image: IMAGES.chicken_curry, description: 'Chicken cooked with fresh coriander seeds & bell peppers (Half)' },
    { name: 'Chicken Kadhai (Full)', category: 'Non-Veg Main Course', price: 449, isVeg: false, image: IMAGES.chicken_curry, description: 'Full portion kadhai chicken cooked with whole red chillies' },
    { name: 'Chicken Do Payaza', category: 'Non-Veg Main Course', price: 335, isVeg: false, image: IMAGES.chicken_curry, description: 'Chicken preparation with double quantity of caramelized onions' },
    { name: 'Murg Musallam', category: 'Non-Veg Main Course', price: 299, isVeg: false, image: IMAGES.chicken_curry, isBestseller: true, description: 'Royal Mughlai style spiced chicken in thick rich almond gravy' },
    { name: 'Chicken Handi (Half)', category: 'Non-Veg Main Course', price: 215, isVeg: false, image: IMAGES.chicken_curry, description: 'Clay handi slow-cooked spicy chicken gravy (Half)' },
    { name: 'Chicken Handi (Full)', category: 'Non-Veg Main Course', price: 235, isVeg: false, image: IMAGES.chicken_curry, isBestseller: true, description: 'Full portion chicken simmered in traditional earthen pot' },
    { name: 'Egg Do Payaza – 2 pcs', category: 'Non-Veg Main Course', price: 249, isVeg: false, image: IMAGES.egg_curry, description: 'Hard-boiled eggs tossed in thick onion gravy with spices (2 eggs)' },
    { name: 'Egg Curry', category: 'Non-Veg Main Course', price: 299, isVeg: false, image: IMAGES.egg_curry, description: 'Classic homestyle spiced egg curry (4 eggs)' },
    { name: 'Omelet Curry', category: 'Non-Veg Main Course', price: 350, isVeg: false, image: IMAGES.egg_curry, description: 'Fluffy masala omelet folded and simmered in spicy curry' },
    { name: 'Rawa Chicken (Half)', category: 'Non-Veg Main Course', price: 299, isVeg: false, image: IMAGES.chicken_curry, description: 'Crispy rawa crusted chicken chunks with mild gravy (Half)' },
    { name: 'Chicken Angara (Half)', category: 'Non-Veg Main Course', price: 350, isVeg: false, image: IMAGES.chicken_curry, isBestseller: true, description: 'Smoky charcoal-infused fiery chicken gravy' },

    // 🥗 Salad & Raita
    { name: 'Green Salad (Half)', category: 'Salad & Raita', price: 45, isVeg: true, image: IMAGES.salad_raita, description: 'Fresh cucumber, tomato, carrot and lemon slices (Half)' },
    { name: 'Green Salad (Full)', category: 'Salad & Raita', price: 90, isVeg: true, image: IMAGES.salad_raita, description: 'Platter of garden fresh crunchy vegetables (Full)' },
    { name: 'Onion Salad (Half)', category: 'Salad & Raita', price: 45, isVeg: true, image: IMAGES.salad_raita, description: 'Sliced red onions with green chillies & lemon (Half)' },
    { name: 'Onion Salad (Full)', category: 'Salad & Raita', price: 90, isVeg: true, image: IMAGES.salad_raita, description: 'Full plate sliced onions with chaat masala (Full)' },
    { name: 'Tomato & Onion Salad', category: 'Salad & Raita', price: 70, isVeg: true, image: IMAGES.salad_raita, description: 'Tossed tomato rings and crunchy onions with lemon dressing' },
    { name: 'Mix Raita', category: 'Salad & Raita', price: 70, isVeg: true, image: IMAGES.salad_raita, description: 'Chilled whipped curd with cucumber, tomato and roasted jeera' },
    { name: 'Boondi Raita', category: 'Salad & Raita', price: 70, isVeg: true, image: IMAGES.salad_raita, isBestseller: true, description: 'Crispy salted boondi in spiced curd with fresh mint' },
    { name: 'Plain Curd', category: 'Salad & Raita', price: 50, isVeg: true, image: IMAGES.salad_raita, description: 'Freshly set sweet and thick homestyle dahi' },

    // 🍚 Rice
    { name: 'Plain Rice', category: 'Rice', price: 89, isVeg: true, image: IMAGES.fried_rice, description: 'Steamed premium long-grain aromatic basmati rice' },
    { name: 'Jeera Rice', category: 'Rice', price: 99, isVeg: true, image: IMAGES.fried_rice, isBestseller: true, description: 'Basmati rice tempered with roasted cumin seeds & pure ghee' },
    { name: 'Veg Fried Rice', category: 'Rice', price: 149, isVeg: true, image: IMAGES.fried_rice, description: 'Wok-tossed rice with assorted garden vegetables' },
    { name: 'Non-Veg Fried Rice', category: 'Rice', price: 189, isVeg: false, image: IMAGES.fried_rice, description: 'Egg and shredded chicken fried rice' },
    { name: 'Egg Fried Rice', category: 'Rice', price: 170, isVeg: false, image: IMAGES.fried_rice, description: 'Basmati rice tossed with golden scrambled eggs and spring onions' },
    { name: 'Veg Biryani', category: 'Rice', price: 140, isVeg: true, image: IMAGES.biryani_veg, isBestseller: true, description: 'Dum-cooked fragrant basmati rice with vegetables & saffron' },
    { name: 'Chicken Biryani', category: 'Rice', price: 190, isVeg: false, image: IMAGES.biryani_chicken, isBestseller: true, description: 'Hyderabadi style layered chicken biryani with fried onions & spices' },
    { name: 'Chicken Leg Biryani', category: 'Rice', price: 210, isVeg: false, image: IMAGES.biryani_chicken, isBestseller: true, description: 'Spiced basmati rice served with whole tender chicken leg piece' },

    // 🫓 Breads
    { name: 'Tandoori Roti', category: 'Breads', price: 20, isVeg: true, image: IMAGES.naan_roti, description: 'Whole wheat flatbread baked fresh in clay tandoor' },
    { name: 'Butter Tandoori Roti', category: 'Breads', price: 25, isVeg: true, image: IMAGES.naan_roti, isBestseller: true, description: 'Clay tandoor baked roti brushed with pure butter' },
    { name: 'Garlic Naan', category: 'Breads', price: 55, isVeg: true, image: IMAGES.naan_roti, isBestseller: true, description: 'Soft leavened bread infused with minced garlic and coriander' },
    { name: 'Stuff Naan', category: 'Breads', price: 60, isVeg: true, image: IMAGES.naan_roti, description: 'Naan stuffed with spiced potato and paneer filling' },
    { name: 'Stuff Kulcha', category: 'Breads', price: 50, isVeg: true, image: IMAGES.naan_roti, description: 'Tandoori kulcha with savory vegetable stuffing' },
    { name: 'Butter Naan', category: 'Breads', price: 45, isVeg: true, image: IMAGES.naan_roti, isBestseller: true, description: 'Fluffy tandoori naan generously glazed with butter' },
    { name: 'Plain Naan', category: 'Breads', price: 40, isVeg: true, image: IMAGES.naan_roti, description: 'Traditional refined flour bread baked in tandoor' },
    { name: 'Aloo Paratha', category: 'Breads', price: 45, isVeg: true, image: IMAGES.naan_roti, description: 'Crispy wheat bread stuffed with seasoned mashed potatoes' },
    { name: 'Paneer Paratha', category: 'Breads', price: 45, isVeg: true, image: IMAGES.naan_roti, description: 'Paratha stuffed with grated paneer and herbs' },
    { name: 'Lachha Paratha', category: 'Breads', price: 40, isVeg: true, image: IMAGES.laccha_paratha, isBestseller: true, description: 'Multi-layered flaky paratha brushed with butter' },
    { name: 'Sattu Paratha', category: 'Breads', price: 45, isVeg: true, image: IMAGES.naan_roti, description: 'Traditional Bihari roasted gram flour stuffed paratha' },

    // ☕ Kuchh Garam Ho Jaye
    { name: 'Tea', category: 'Kuchh Garam Ho Jaye', price: 25, isVeg: true, image: IMAGES.tea_hot, description: 'Freshly brewed hot milk tea with cardamom' },
    { name: 'Masala Tea', category: 'Kuchh Garam Ho Jaye', price: 35, isVeg: true, image: IMAGES.tea_hot, isBestseller: true, description: 'Aromatic tea simmered with ginger, cloves & cinnamon' },
    { name: 'Green Tea', category: 'Kuchh Garam Ho Jaye', price: 35, isVeg: true, image: IMAGES.tea_hot, description: 'Healthy antioxidant rich warm green tea' },
    { name: 'Hot Coffee', category: 'Kuchh Garam Ho Jaye', price: 40, isVeg: true, image: IMAGES.coffee_hot, isBestseller: true, description: 'Rich frothy instant hot coffee' },
  ]

  for (const item of rjMenuItems) {
    await MenuItemModel.create({
      ...item,
      restaurantId: rj._id,
      isAvailable: true,
    })
  }
  console.log(`Seeded ${rjMenuItems.length} menu items for RJ garden`)

  console.log('✅ ALL RESTAURANTS AND MENUS SEEDED SUCCESSFULLY!')
  process.exit(0)
}

seed().catch(err => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
