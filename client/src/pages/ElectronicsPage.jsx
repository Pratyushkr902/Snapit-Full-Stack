import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

const ELECTRONICS_PRODUCTS = [
  // ── Mobile Accessories ───────────────────────────────────────────────────────
  {
    id: "e1", category: "Mobile Accessories",
    name: "USB-C Fast Charger 33W",
    brand: "Realme / Ambrane",
    description: "33W fast charging adapter compatible with all USB-C phones",
    price: 349, mrp: 599, unit: "1 piece",
    emoji: "🔌", inStock: true,
  },
  {
    id: "e2", category: "Mobile Accessories",
    name: "Tempered Glass Screen Protector",
    brand: "Generic / Gorilla",
    description: "9H hardness, anti-fingerprint screen guard",
    price: 99, mrp: 199, unit: "Pack of 2",
    emoji: "📱", inStock: true,
  },
  {
    id: "e3", category: "Mobile Accessories",
    name: "Mobile Back Cover",
    brand: "Generic",
    description: "Shockproof silicone back cover (specify model at checkout)",
    price: 149, mrp: 299, unit: "1 piece",
    emoji: "🛡️", inStock: true,
  },
  {
    id: "e4", category: "Mobile Accessories",
    name: "Braided USB-C Cable 1.5m",
    brand: "Ambrane / Boat",
    description: "Durable braided cable, 3A fast charging support",
    price: 199, mrp: 349, unit: "1 piece",
    emoji: "🔗", inStock: true,
  },
  // ── Audio ────────────────────────────────────────────────────────────────────
  {
    id: "e5", category: "Audio",
    name: "Wired Earphones",
    brand: "boAt BassHeads",
    description: "Deep bass, inline mic, 3.5mm jack",
    price: 299, mrp: 499, unit: "1 pair",
    emoji: "🎧", inStock: true,
  },
  {
    id: "e6", category: "Audio",
    name: "Bluetooth Earbuds TWS",
    brand: "boAt Airdopes",
    description: "True wireless earbuds, 24hr battery life",
    price: 999, mrp: 1999, unit: "1 pair + case",
    emoji: "🎵", inStock: true,
  },
  {
    id: "e7", category: "Audio",
    name: "Portable Bluetooth Speaker",
    brand: "JBL / Zebronics",
    description: "Waterproof speaker, 8hr playback, loud bass",
    price: 1199, mrp: 1999, unit: "1 piece",
    emoji: "🔊", inStock: true,
  },
  // ── Power & Batteries ────────────────────────────────────────────────────────
  {
    id: "e8", category: "Power & Batteries",
    name: "10000mAh Power Bank",
    brand: "Mi / Ambrane",
    description: "Dual USB output, fast charge, LED indicator",
    price: 799, mrp: 1299, unit: "1 piece",
    emoji: "🔋", inStock: true,
  },
  {
    id: "e9", category: "Power & Batteries",
    name: "AA Batteries",
    brand: "Duracell / Eveready",
    description: "Long-lasting alkaline batteries",
    price: 120, mrp: 150, unit: "Pack of 4",
    emoji: "🪫", inStock: true,
  },
  {
    id: "e10", category: "Power & Batteries",
    name: "Extension Board 4-socket",
    brand: "Havells / Anchor",
    description: "4-socket extension cord with surge protection, 1.5m wire",
    price: 349, mrp: 499, unit: "1 piece",
    emoji: "🔌", inStock: true,
  },
  // ── Computing ────────────────────────────────────────────────────────────────
  {
    id: "e11", category: "Computing",
    name: "Wireless Mouse",
    brand: "Logitech / HP",
    description: "2.4GHz wireless, ergonomic design, 12 months battery",
    price: 499, mrp: 799, unit: "1 piece",
    emoji: "🖱️", inStock: true,
  },
  {
    id: "e12", category: "Computing",
    name: "USB 3.0 Flash Drive 32GB",
    brand: "SanDisk / HP",
    description: "Fast data transfer, compact design",
    price: 349, mrp: 499, unit: "1 piece",
    emoji: "💾", inStock: true,
  },
  // ── Home Electronics ─────────────────────────────────────────────────────────
  {
    id: "e13", category: "Home Electronics",
    name: "LED Bulb 9W",
    brand: "Philips / Syska",
    description: "Energy-saving warm white LED, B22 base",
    price: 75, mrp: 110, unit: "Pack of 2",
    emoji: "💡", inStock: true,
  },
  {
    id: "e14", category: "Home Electronics",
    name: "Table Fan 12 inch",
    brand: "Usha / Havells",
    description: "3-speed settings, 360° rotation, energy efficient",
    price: 1299, mrp: 1799, unit: "1 piece",
    emoji: "🌀", inStock: true,
  },
  {
    id: "e15", category: "Home Electronics",
    name: "Night Lamp USB",
    brand: "Generic",
    description: "Touch sensor, 3 brightness levels, warm & cool light",
    price: 199, mrp: 349, unit: "1 piece",
    emoji: "🌙", inStock: true,
  },
]

const CATEGORIES = ["All", ...Array.from(new Set(ELECTRONICS_PRODUCTS.map(p => p.category)))]

const ProductCard = ({ product }) => {
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100)

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-3xl">{product.emoji}</span>
        {discount > 0 && (
          <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            {discount}% OFF
          </span>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{product.name}</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">{product.brand}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{product.unit}</p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <div>
          <span className="font-bold text-gray-800 text-sm">₹{product.price}</span>
          {product.mrp > product.price && (
            <span className="text-[10px] text-gray-400 line-through ml-1">₹{product.mrp}</span>
          )}
        </div>
        <button className="bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition">
          Add
        </button>
      </div>
    </div>
  )
}

const ElectronicsPage = () => {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState("All")
  const [search, setSearch] = useState("")

  const filtered = ELECTRONICS_PRODUCTS.filter(p => {
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
            <h1 className="text-lg font-bold text-gray-800">📱 Electronics</h1>
            <p className="text-xs text-gray-400">Gadgets, accessories & home electronics</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products or brands..."
            className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === cat
                ? "bg-purple-500 text-white shadow-sm"
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
            <span className="text-5xl">📱</span>
            <p className="text-gray-500 font-medium">No products found</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All") }}
              className="text-purple-500 text-sm font-semibold"
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

export default ElectronicsPage