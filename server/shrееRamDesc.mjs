import { MongoClient, ObjectId } from 'mongodb';

const uri = "mongodb+srv://00pr1199_db_user:vBwz9MdbZlvkLAgo@snapit.na1dsaj.mongodb.net/snapit";
const client = new MongoClient(uri);

const descriptions = {
  "Samosa": "Crispy golden fried triangle pastry stuffed with perfectly spiced potato filling, prepared fresh and served hot for the perfect evening snack.",
  "Samosa Pair": "Two crispy golden fried samosas stuffed with perfectly spiced potato filling, prepared fresh and served hot for the perfect evening snack.",
  "Litti": "Traditional Bihari delicacy made with roasted wheat dough stuffed with spicy sattu filling, cooked authentically for rich desi flavor.",
  "Litti Pair": "Two traditional Bihari littis made with roasted wheat dough stuffed with spicy sattu filling, cooked authentically for rich desi flavor.",
  "Chaat (Half)": "Delicious street-style chaat prepared with crispy ingredients, tangy chutneys, fresh vegetables, and flavorful spices for a mouthwatering taste.",
  "Chaat (Full)": "Full plate of delicious street-style chaat prepared with crispy ingredients, tangy chutneys, fresh vegetables, and flavorful spices.",
  "Raskadum (Per Piece)": "Premium Bengali sweet made with soft chhena stuffed with rich dry fruit filling and soaked lightly for a rich creamy taste.",
  "Raskadum (Half Kg)": "Half kg of premium Bengali sweet made with soft chhena stuffed with rich dry fruit filling for a rich creamy taste.",
  "Raskadum (Full Kg)": "Full kg of premium Bengali sweet made with soft chhena stuffed with rich dry fruit filling for a rich creamy taste.",
  "Kalakand (Per Piece)": "Traditional milk-based sweet prepared from fresh khoya, slowly cooked for a grainy texture and rich authentic sweetness.",
  "Kalakand (Half Kg)": "Half kg of traditional milk-based sweet prepared from fresh khoya, slowly cooked for a grainy texture and rich sweetness.",
  "Kalakand (Full Kg)": "Full kg of traditional milk-based sweet prepared from fresh khoya, slowly cooked for a grainy texture and rich sweetness.",
  "Khir Kadam (Per Piece)": "Classic Bengali delicacy made with soft rasgulla coated in rich khoya, giving a creamy and delicious layered flavor.",
  "Khir Kadam (Half Kg)": "Half kg of classic Bengali delicacy made with soft rasgulla coated in rich khoya for a creamy layered flavor.",
  "Khir Kadam (Full Kg)": "Full kg of classic Bengali delicacy made with soft rasgulla coated in rich khoya for a creamy layered flavor.",
  "Khoa Roll (Per Piece)": "Soft and rich milk-based sweet roll prepared with premium khoa and lightly flavored for smooth melt-in-mouth texture.",
  "Khoa Roll (Half Kg)": "Half kg of soft rich milk-based sweet rolls prepared with premium khoa for smooth melt-in-mouth texture.",
  "Khoa Roll (Full Kg)": "Full kg of soft rich milk-based sweet rolls prepared with premium khoa for smooth melt-in-mouth texture.",
  "Creme Chalk (Per Piece)": "Creamy sweet delicacy prepared with fresh chhena and rich milk cream for a soft smooth premium dessert experience.",
  "Creme Chalk (Half Kg)": "Half kg of creamy sweet delicacy prepared with fresh chhena and rich milk cream for a smooth premium dessert.",
  "Creme Chalk (Full Kg)": "Full kg of creamy sweet delicacy prepared with fresh chhena and rich milk cream for a smooth premium dessert.",
  "Kala Cream Chalk (Per Piece)": "Special dark cream variation of creamy Bengali sweet prepared with rich texture and balanced sweetness.",
  "Kala Cream Chalk (Half Kg)": "Half kg of special dark cream Bengali sweet prepared with rich texture and perfectly balanced sweetness.",
  "Kala Cream Chalk (Full Kg)": "Full kg of special dark cream Bengali sweet prepared with rich texture and perfectly balanced sweetness.",
  "Chenna Roll (Per Piece)": "Soft fresh chhena rolled perfectly and filled with sweet rich ingredients for a premium Bengali dessert experience.",
  "Chenna Roll (Half Kg)": "Half kg of soft fresh chhena rolls filled with sweet rich ingredients for a premium Bengali dessert experience.",
  "Chenna Roll (Full Kg)": "Full kg of soft fresh chhena rolls filled with sweet rich ingredients for a premium Bengali dessert experience.",
  "Malai Toast (Per Piece)": "Rich milk cream dessert prepared with soft sweet base layered with thick fresh malai for a delicious creamy taste.",
  "Malai Toast (Half Kg)": "Half kg of rich milk cream dessert with soft sweet base layered with thick fresh malai for a creamy taste.",
  "Malai Toast (Full Kg)": "Full kg of rich milk cream dessert with soft sweet base layered with thick fresh malai for a creamy taste.",
  "Malai Chamcham (Per Piece)": "Premium Bengali chamcham sweet topped generously with fresh malai for a soft juicy and creamy dessert experience.",
  "Malai Chamcham (Half Kg)": "Half kg of premium Bengali chamcham topped generously with fresh malai for a soft juicy creamy experience.",
  "Malai Chamcham (Full Kg)": "Full kg of premium Bengali chamcham topped generously with fresh malai for a soft juicy creamy experience.",
  "Chhena (Per Piece)": "Fresh homemade soft paneer-based Bengali sweet prepared with authentic traditional recipe and light sweetness.",
  "Chhena (Half Kg)": "Half kg of fresh homemade soft paneer-based Bengali sweet prepared with authentic traditional recipe.",
  "Chhena (Full Kg)": "Full kg of fresh homemade soft paneer-based Bengali sweet prepared with authentic traditional recipe.",
  "Rasbhari (Per Piece)": "Soft juicy Bengali sweet soaked in sugar syrup, prepared fresh daily with rich traditional taste.",
  "Rasbhari (Half Kg)": "Half kg of soft juicy Bengali sweets soaked in sugar syrup, prepared fresh daily with rich traditional taste.",
  "Rasbhari (Full Kg)": "Full kg of soft juicy Bengali sweets soaked in sugar syrup, prepared fresh daily with rich traditional taste.",
  "Rajbhog (Per Piece)": "Premium large rasgulla stuffed with dry fruits and flavored ingredients for a royal Bengali sweet experience.",
  "Rasmalai (Cup / 2 Pieces)": "Soft chhena discs soaked in chilled creamy saffron flavored milk for a rich refreshing dessert experience.",
  "Chenna Piece (Cup)": "Soft fresh chhena sweet served chilled with rich creamy texture and balanced sweetness.",
  "Guur Rasgulla (Per Piece)": "Traditional Bengali rasgulla prepared using jaggery syrup, giving a rich natural sweetness and authentic flavor.",
  "Guur Rasgulla (Half Kg)": "Half kg of traditional Bengali rasgulla prepared using jaggery syrup for a rich natural sweetness.",
  "Guur Rasgulla (Full Kg)": "Full kg of traditional Bengali rasgulla prepared using jaggery syrup for a rich natural sweetness.",
  "Kaju Barfi (Per Piece)": "Premium cashew-based rich sweet prepared with high quality kaju for a smooth luxurious melt-in-mouth taste.",
  "Kaju Barfi (Half Kg)": "Half kg of premium cashew-based rich sweet prepared with high quality kaju for a smooth luxurious taste.",
  "Kaju Barfi (Full Kg)": "Full kg of premium cashew-based rich sweet prepared with high quality kaju for a smooth luxurious taste.",
  "Barfi / Pera (Per Piece)": "Traditional Indian milk sweet prepared using fresh khoya and sugar, offering a rich creamy texture and authentic taste.",
  "Barfi / Pera (Half Kg)": "Half kg of traditional Indian milk sweet prepared using fresh khoya and sugar for rich creamy authentic taste.",
  "Barfi / Pera (Full Kg)": "Full kg of traditional Indian milk sweet prepared using fresh khoya and sugar for rich creamy authentic taste.",
  "Batisha (Per Piece)": "Classic crunchy sugar-based sweet prepared traditionally and enjoyed as a light festive sweet treat.",
  "Batisha (Half Kg)": "Half kg of classic crunchy sugar-based sweet prepared traditionally for a light festive sweet treat.",
  "Batisha (Full Kg)": "Full kg of classic crunchy sugar-based sweet prepared traditionally for a light festive sweet treat.",
  "Milk Cake (Per Piece)": "Rich dense milk-based sweet prepared by slow cooking fresh milk until perfectly caramelized for authentic flavor.",
  "Milk Cake (Half Kg)": "Half kg of rich dense milk cake prepared by slow cooking fresh milk until perfectly caramelized.",
  "Milk Cake (Full Kg)": "Full kg of rich dense milk cake prepared by slow cooking fresh milk until perfectly caramelized.",
  "Besan Laddu (Per Piece)": "Soft round sweet ball made with roasted gram flour, pure ghee, sugar, and dry fruits for classic homemade taste.",
  "Besan Laddu (Half Kg)": "Half kg of soft round sweet balls made with roasted gram flour, pure ghee, sugar, and dry fruits.",
  "Besan Laddu (Full Kg)": "Full kg of soft round sweet balls made with roasted gram flour, pure ghee, sugar, and dry fruits.",
  "Motichoor Laddu (Per Piece)": "Traditional festive sweet prepared with tiny boondi pearls soaked in sugar syrup and shaped perfectly for rich flavor.",
  "Motichoor Laddu (Half Kg)": "Half kg of traditional motichoor laddu prepared with tiny boondi pearls soaked in sugar syrup.",
  "Motichoor Laddu (Full Kg)": "Full kg of traditional motichoor laddu prepared with tiny boondi pearls soaked in sugar syrup.",
  "Kalajamun Large (Per Piece)": "Large soft deep-fried khoya sweet soaked in sugar syrup, offering rich juicy sweetness in every bite.",
  "Kalajamun Small (Per Piece)": "Classic smaller version of soft syrup-soaked khoya sweet with rich caramelized flavor and smooth texture.",
  "Kalajamun (Half Kg)": "Half kg of traditional dark fried milk sweets soaked perfectly in sugar syrup for rich authentic taste.",
  "Kalajamun (Full Kg)": "Full kg of traditional dark fried milk sweets soaked perfectly in sugar syrup for rich authentic taste.",
  "Rasgulla / Layi (Per Piece)": "Soft spongy chhena ball soaked in fresh sugar syrup, prepared daily for a juicy refreshing sweet taste.",
  "Rasgulla / Layi (Half Kg)": "Half kg of soft spongy chhena balls soaked in fresh sugar syrup, prepared daily for a juicy refreshing taste.",
  "Rasgulla / Layi (Full Kg)": "Full kg of soft spongy chhena balls soaked in fresh sugar syrup, prepared daily for a juicy refreshing taste.",
  "Special Layi (Per Piece)": "Premium syrup sweet prepared with richer ingredients and extra softness for a superior dessert experience.",
  "Special Layi (Half Kg)": "Half kg of premium syrup sweet prepared with richer ingredients and extra softness for a superior experience.",
  "Special Layi (Full Kg)": "Full kg of premium syrup sweet prepared with richer ingredients and extra softness for a superior experience.",
  "Lassi": "Thick creamy yogurt-based traditional drink blended fresh and served chilled for a refreshing and cooling taste experience.",
};

async function run() {
  await client.connect();
  const db = client.db('snapit');
  const restaurantId = new ObjectId('6a343566a9b1f31e3ba04832');

  let updated = 0;
  for (const [name, description] of Object.entries(descriptions)) {
    const result = await db.collection('menuitems').updateOne(
      { restaurantId, name },
      { $set: { description, updatedAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ ${name}`);
      updated++;
    } else {
      console.log(`⚠️  Not found: ${name}`);
    }
  }

  console.log(`\n🎉 Done! ${updated} menu items updated.`);
  await client.close();
}

run().catch(console.error);
