import { MongoClient, ObjectId } from 'mongodb';

const uri = "mongodb+srv://00pr1199_db_user:vBwz9MdbZlvkLAgo@snapit.na1dsaj.mongodb.net/snapit";
const client = new MongoClient(uri);

const descriptions = {
  "Samosa": "Crispy golden fried triangle pastry stuffed with perfectly spiced potato filling, prepared fresh and served hot for the perfect evening snack.",
  "Litti": "Traditional Bihari delicacy made with roasted wheat dough stuffed with spicy sattu filling, cooked authentically for rich desi flavor.",
  "Chaat": "Delicious street-style chaat prepared with crispy ingredients, tangy chutneys, fresh vegetables, and flavorful spices for a mouthwatering taste.",
  "Raskadum": "Premium Bengali sweet made with soft chhena stuffed with rich dry fruit filling and soaked lightly for a rich creamy taste.",
  "Kalakand": "Traditional milk-based sweet prepared from fresh khoya, slowly cooked for a grainy texture and rich authentic sweetness.",
  "Khir Kadam": "Classic Bengali delicacy made with soft rasgulla coated in rich khoya, giving a creamy and delicious layered flavor.",
  "Khoa Roll": "Soft and rich milk-based sweet roll prepared with premium khoa and lightly flavored for smooth melt-in-mouth texture.",
  "Creme Chalk": "Creamy sweet delicacy prepared with fresh chhena and rich milk cream for a soft smooth premium dessert experience.",
  "Kala Cream Chalk": "Special dark cream variation of creamy Bengali sweet prepared with rich texture and balanced sweetness.",
  "Chenna Roll": "Soft fresh chhena rolled perfectly and filled with sweet rich ingredients for a premium Bengali dessert experience.",
  "Malai Toast": "Rich milk cream dessert prepared with soft sweet base layered with thick fresh malai for a delicious creamy taste.",
  "Malai Chamcham": "Premium Bengali chamcham sweet topped generously with fresh malai for a soft juicy and creamy dessert experience.",
  "Chhena": "Fresh homemade soft paneer-based Bengali sweet prepared with authentic traditional recipe and light sweetness.",
  "Rasbhari": "Soft juicy Bengali sweet soaked in sugar syrup, prepared fresh daily with rich traditional taste.",
  "Rajbhog": "Premium large rasgulla stuffed with dry fruits and flavored ingredients for a royal Bengali sweet experience.",
  "Rasmalai": "Soft chhena discs soaked in chilled creamy saffron flavored milk for a rich refreshing dessert experience.",
  "Chenna Piece": "Soft fresh chhena sweet served chilled with rich creamy texture and balanced sweetness.",
  "Guur Rasgulla": "Traditional Bengali rasgulla prepared using jaggery syrup, giving a rich natural sweetness and authentic flavor.",
  "Kaju Barfi": "Premium cashew-based rich sweet prepared with high quality kaju and crafted for a smooth luxurious melt-in-mouth taste.",
  "Barfi / Pera": "Traditional Indian milk sweet prepared using fresh khoya and sugar, offering a rich creamy texture and authentic taste.",
  "Batisha": "Classic crunchy sugar-based sweet prepared traditionally and enjoyed as a light festive sweet treat.",
  "Milk Cake": "Rich dense milk-based sweet prepared by slow cooking fresh milk until perfectly caramelized for authentic traditional flavor.",
  "Besan Laddu": "Soft round sweet balls made with roasted gram flour, pure ghee, sugar, and dry fruits for classic homemade taste.",
  "Motichoor Laddu": "Traditional festive sweet prepared with tiny boondi pearls soaked in sugar syrup and shaped perfectly for rich flavor.",
  "Kalajamun (Large)": "Large soft deep-fried khoya sweet soaked in sugar syrup, offering rich juicy sweetness in every bite.",
  "Kalajamun (Small)": "Classic smaller version of soft syrup-soaked khoya sweet with rich caramelized flavor and smooth texture.",
  "Kalajamun": "Traditional dark fried milk sweet soaked perfectly in sugar syrup for a rich authentic Indian dessert experience.",
  "Rasgulla / Layi": "Soft spongy chhena balls soaked in fresh sugar syrup, prepared daily for a juicy refreshing sweet taste.",
  "Special Layi": "Premium syrup sweet prepared with richer ingredients and extra softness for a superior dessert experience.",
  "Lassi": "Thick creamy yogurt-based traditional drink blended fresh and served chilled for a refreshing and cooling taste experience.",
};

async function run() {
  await client.connect();
  const db = client.db('snapit');
  const restaurantId = new ObjectId('6a343566a9b1f31e3ba04832');

  let updated = 0;
  for (const [name, description] of Object.entries(descriptions)) {
    const result = await db.collection('menuitems').updateOne(
      { restaurantId, name: { $regex: new RegExp('^' + name + '$', 'i') } },
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
