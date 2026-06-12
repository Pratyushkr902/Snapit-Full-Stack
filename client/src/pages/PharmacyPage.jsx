import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

const PHARMACY_PRODUCTS = [
  // ── Medicines ────────────────────────────────────────────────────────────────
  {
    id: "p1", category: "Medicines",
    name: "Paracetamol 500mg",
    brand: "Calpol / Generic",
    description: "Fever & mild pain relief tablets",
    price: 22, mrp: 28, unit: "Strip of 15",
    emoji: "💊", inStock: true, requiresPrescription: false,
  },
  {
    id: "p2", category: "Medicines",
    name: "Cetirizine 10mg",
    brand: "Alerid / Generic",
    description: "Antihistamine for cold & allergy relief",
    price: 18, mrp: 24, unit: "Strip of 10",
    emoji: "💊", inStock: true, requiresPrescription: false,
  },
  {
    id: "p3", category: "Medicines",
    name: "Pantoprazole 40mg",
    brand: "Pan-D / Generic",
    description: "Acidity & gastric relief",
    price: 35, mrp: 45, unit: "Strip of 10",
    emoji: "💊", inStock: true, requiresPrescription: false,
  },
  {
    id: "p4", category: "Medicines",
    name: "ORS Sachet",
    brand: "Electral",
    description: "Oral rehydration salts for dehydration",
    price: 15, mrp: 20, unit: "Pack of 5",
    emoji: "🧪", inStock: true, requiresPrescription: false,
  },
  // ── Vitamins & Supplements ───────────────────────────────────────────────────
  {
    id: "p5", category: "Vitamins & Supplements",
    name: "Vitamin C 500mg",
    brand: "Limcee / Celin",
    description: "Immunity booster & antioxidant",
    price: 55, mrp: 70, unit: "Bottle of 30 tabs",
    emoji: "🍊", inStock: true, requiresPrescription: false,
  },
  {
    id: "p6", category: "Vitamins & Supplements",
    name: "Vitamin D3 1000IU",
    brand: "D-Rise",
    description: "Bone health & immunity support",
    price: 120, mrp: 150, unit: "Bottle of 60 caps",
    emoji: "☀️", inStock: true, requiresPrescription: false,
  },
  {
    id: "p7", category: "Vitamins & Supplements",
    name: "Zinc + Magnesium",
    brand: "Zincovit",
    description: "Essential minerals for immunity & metabolism",
    price: 90, mrp: 110, unit: "Bottle of 15 tabs",
    emoji: "⚡", inStock: true, requiresPrescription: false,
  },
  {
    id: "p8", category: "Vitamins & Supplements",
    name: "Omega-3 Fish Oil",
    brand: "Himalaya / Generic",
    description: "Heart health & brain function",
    price: 180, mrp: 220, unit: "Bottle of 60 caps",
    emoji: "🐟", inStock: true, requiresPrescription: false,
  },
  // ── First Aid ────────────────────────────────────────────────────────────────
  {
    id: "p9", category: "First Aid",
    name: "Band-Aid / Plasters",
    brand: "Band-Aid",
    description: "Adhesive bandages for cuts & wounds",
    price: 45, mrp: 55, unit: "Box of 20",
    emoji: "🩹", inStock: true, requiresPrescription: false,
  },
  {
    id: "p10", category: "First Aid",
    name: "Antiseptic Liquid",
    brand: "Dettol / Savlon",
    description: "Wound cleaning & infection prevention",
    price: 65, mrp: 80, unit: "100ml bottle",
    emoji: "🧴", inStock: true, requiresPrescription: false,
  },
  {
    id: "p11", category: "First Aid",
    name: "Digital Thermometer",
    brand: "Dr. Morepen",
    description: "Fast & accurate fever reading",
    price: 180, mrp: 250, unit: "1 piece",
    emoji: "🌡️", inStock: true, requiresPrescription: false,
  },
  // ── Wellness ─────────────────────────────────────────────────────────────────
  {
    id: "p12", category: "Wellness",
    name: "Ashwagandha Tablets",
    brand: "Himalaya / Dabur",
    description: "Stress relief & energy boost",
    price: 150, mrp: 185, unit: "Bottle of 60 tabs",
    emoji: "🌿", inStock: true, requiresPrescription: false,
  },
  {
    id: "p13", category: "Wellness",
    name: "Tulsi + Ginger Drops",
    brand: "Dabur",
    description: "Immunity & respiratory health",
    price: 80, mrp: 100, unit: "30ml bottle",
    emoji: "🌱", inStock: true, requiresPrescription: false,
  },
  {
    id: "p14", category: "Wellness",
    name: "Chyawanprash",
    brand: "Dabur",
    description: "Traditional Ayurvedic immunity tonic",
    price: 175, mrp: 210, unit: "500g jar",
    emoji: "🫙", inStock: true, requiresPrescription: false,
  },
  {
    id: "p15", category: "Wellness",
    name: "Hand Sanitizer",
    brand: "Dettol",
    description: "Kills 99.9% germs without water",
    price: 55, mrp: 70, unit: "200ml",
    emoji: "🖐️", inStock: true, requiresPrescription: false,
  },
  // ── Baby & Mother Care ───────────────────────────────────────────────────────
  {
    id: "p16", category: "Baby & Mother Care",
    name: "Baby Powder",
    brand: "Johnson's",
    description: "Gentle talc-free powder for babies",
    price: 120, mrp: 145, unit: "200g",
    emoji: "👶", inStock: true, requiresPrescription: false,
  },
  {
    id: "p17", category: "Baby & Mother Care",
    name: "Gripe Water",
    brand: "Woodward's",
    description: "Colic & gas relief for infants",
    price: 75, mrp: 90, unit: "130ml bottle",
    emoji: "🍼", inStock: true, requiresPrescription: false,
  },
]

const CATEGORIES = ["All", ...Array.from(new Set(PHARMACY_PRODUCTS.map(p => p.category)))]

const ProductCard = ({ product }) => {
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100)

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-3xl">{product.emoji}</span>
        {discount > 0 && (
          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            {discount}% OFF
          </span>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1">{product.name}</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">{product.brand}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{product.unit}</p>
      </div>

      {product.requiresPrescription && (
        <span className="text-[9px] bg-red-50 text-red-500 font-semibold px-2 py-0.5 rounded-full self-start">
          Rx Required
        </span>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div>
          <span className="font-bold text-gray-800 text-sm">₹{product.price}</span>
          {product.mrp > product.price && (
            <span className="text-[10px] text-gray-400 line-through ml-1">₹{product.mrp}</span>
          )}
        </div>
        <button className="bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition">
          Add
        </button>
      </div>
    </div>
  )
}

const PharmacyPage = () => {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState("All")
  const [search, setSearch] = useState("")

  const filtered = PHARMACY_PRODUCTS.filter(p => {
    const matchCat = activeCategory === "All" || p.category === activeCategory
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <section className="bg-gray-50 min-h-screen pb-24">

      {/* Header */}
      <div className="bg-white sticky top-0 z-20 px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-full bg-gray-100 active:scale-95 transition shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">💊 Pharmacy & Wellness</h1>
            <p className="text-xs text-gray-400">Medicines, vitamins & more</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search medicines, brands..."
            className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* Prescription upload banner */}
      <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center gap-3">
        <span className="text-2xl">📋</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">Have a prescription?</p>
          <p className="text-xs text-blue-500">Upload it and we'll arrange your medicines</p>
        </div>
        <button className="ml-auto shrink-0 bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition">
          Upload
        </button>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === cat
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div className="px-4 pt-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <span className="text-5xl">💊</span>
            <p className="text-gray-500 font-medium">No products found</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All") }}
              className="text-blue-500 text-sm font-semibold"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3 font-medium">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default PharmacyPage