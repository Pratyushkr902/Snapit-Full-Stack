import toast from 'react-hot-toast'
import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://snapit-backend-bn8r.onrender.com"

// ── Hardcoded local restaurants (always shown even if API is empty) ────────────
const LOCAL_RESTAURANTS = [
  {
    _id: "local-1",
    name: "Paliganj Resto",
    description: "Classic desi flavours — dal, sabzi, roti & more",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop",
    cuisineTypes: ["Indian", "Thali", "Dal-Rice"],
    rating: 4.5,
    totalRatings: 182,
    deliveryTimeMin: 20,
    deliveryTimeMax: 35,
    deliveryFee: 15,
    minOrderValue: 80,
    isPureVeg: true,
    isOpen: true,
    tags: ["bestseller", "pure-veg"],
    address: { area: "Main Market", city: "Paliganj" },
  },
  {
    _id: "local-2",
    name: "Pali Paradise",
    description: "Kebabs, tikka & rich Mughlai curries",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop",
    cuisineTypes: ["Mughlai", "Kebabs", "Biryani"],
    rating: 4.6,
    totalRatings: 241,
    deliveryTimeMin: 25,
    deliveryTimeMax: 40,
    deliveryFee: 20,
    minOrderValue: 120,
    isPureVeg: false,
    isOpen: true,
    tags: ["trending"],
    address: { area: "Bus Stand Road", city: "Paliganj" },
  },
  {
    _id: "local-3",
    name: "Alka Restaurant",
    description: "Family restaurant serving veg & non-veg since 1998",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop",
    cuisineTypes: ["Indian", "Chinese", "Fast Food"],
    rating: 4.3,
    totalRatings: 317,
    deliveryTimeMin: 20,
    deliveryTimeMax: 40,
    deliveryFee: 10,
    minOrderValue: 100,
    isPureVeg: false,
    isOpen: true,
    tags: ["popular"],
    address: { area: "Station Road", city: "Paliganj" },
  },
  {
    _id: "local-4",
    name: "Dom Biryani",
    description: "Dum-cooked aromatic biryani — chicken, mutton & veg",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop",
    cuisineTypes: ["Biryani", "Mughlai", "Rice"],
    rating: 4.7,
    totalRatings: 408,
    deliveryTimeMin: 30,
    deliveryTimeMax: 50,
    deliveryFee: 25,
    minOrderValue: 150,
    isPureVeg: false,
    isOpen: true,
    tags: ["bestseller", "must-try"],
    address: { area: "College Road", city: "Paliganj" },
  },
]

const CUISINE_FILTERS = ["All", "Biryani", "Indian", "Mughlai", "Chinese", "Fast Food"]

const StarIcon = () => (
  <svg className="w-3 h-3 fill-yellow-400 text-yellow-400 inline" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

const RestaurantCard = ({ restaurant, onClick }) => {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      onClick={() => onClick(restaurant)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform duration-150 cursor-pointer"
    >
      {/* Image */}
      <div className="relative w-full h-40 bg-gray-100">
        {!imgError ? (
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-orange-50">
            🍽️
          </div>
        )}

        {/* Open/Closed badge */}
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          restaurant.isOpen
            ? "bg-green-500 text-white"
            : "bg-gray-400 text-white"
        }`}>
          {restaurant.isOpen ? "OPEN" : "CLOSED"}
        </span>

        {/* Tags */}
        {restaurant.tags?.includes("bestseller") && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">
            🔥 Bestseller
          </span>
        )}
        {restaurant.isPureVeg && (
          <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
            🌿 Pure Veg
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-800 text-sm leading-tight">{restaurant.name}</h3>
          <span className="flex items-center gap-0.5 bg-green-50 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0">
            <StarIcon /> {restaurant.rating}
          </span>
        </div>

        <p className="text-gray-400 text-[11px] mt-0.5 line-clamp-1">{restaurant.description}</p>
        <p className="text-gray-400 text-[11px] mt-0.5">{restaurant.cuisineTypes?.join(" • ")}</p>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <span className="text-[11px] text-gray-500">
            ⏱ {restaurant.deliveryTimeMin}–{restaurant.deliveryTimeMax} min
          </span>
          <span className="text-[11px] text-gray-500">
            {restaurant.deliveryFee === 0 ? "🆓 Free delivery" : `🛵 ₹${restaurant.deliveryFee} delivery`}
          </span>
        </div>

        {restaurant.minOrderValue > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Min order: ₹{restaurant.minOrderValue}
          </p>
        )}
      </div>
    </div>
  )
}

const FoodHomePage = () => {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState(LOCAL_RESTAURANTS)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("All")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/restaurant/all`)
        if (res.data?.success && res.data.data?.length > 0) {
          // Merge API restaurants with local ones, avoid duplicates by name
          const apiNames = res.data.data.map(r => r.name.toLowerCase())
          const uniqueLocal = LOCAL_RESTAURANTS.filter(
            r => !apiNames.includes(r.name.toLowerCase())
          )
          setRestaurants([...LOCAL_RESTAURANTS, ...res.data.data.filter(
            r => !LOCAL_RESTAURANTS.map(l => l.name.toLowerCase()).includes(r.name.toLowerCase())
          )])
        }
      } catch (err) {
        // Keep local restaurants on API failure
        console.log("Using local restaurant data")
      } finally {
        setLoading(false)
      }
    }
    fetchRestaurants()
  }, [])

  const filtered = restaurants.filter(r => {
    const matchFilter = activeFilter === "All" || r.cuisineTypes?.some(
      c => c.toLowerCase().includes(activeFilter.toLowerCase())
    )
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisineTypes?.some(c => c.toLowerCase().includes(search.toLowerCase()))
    return matchFilter && matchSearch
  })

  const handleRestaurantClick = (restaurant) => {
    // For local hardcoded restaurants, show a coming soon toast
    // For API restaurants, navigate to detail page
    if (restaurant._id?.startsWith("local-")) {
      toast("Coming soon! This restaurant will be available shortly.")
    } else {
      navigate(`/restaurant/${restaurant._id}`, { state: { restaurant } })
    }
  }

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
            <h1 className="text-lg font-bold text-gray-800">🍔 Food Delivery</h1>
            <p className="text-xs text-gray-400">Paliganj & nearby</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search restaurants or cuisines..."
            className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
      </div>

      {/* Cuisine filters */}
      <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar">
        {CUISINE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeFilter === f
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Restaurant grid */}
      <div className="px-4 pt-3">
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="w-full h-40 bg-gray-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <span className="text-5xl">🍽️</span>
            <p className="text-gray-500 font-medium">No restaurants found</p>
            <button
              onClick={() => { setSearch(""); setActiveFilter("All") }}
              className="text-orange-500 text-sm font-semibold"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3 font-medium">
              {filtered.length} restaurant{filtered.length !== 1 ? "s" : ""} nearby
            </p>
            <div className="grid grid-cols-1 gap-4">
              {filtered.map(r => (
                <RestaurantCard
                  key={r._id}
                  restaurant={r}
                  onClick={handleRestaurantClick}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default FoodHomePage