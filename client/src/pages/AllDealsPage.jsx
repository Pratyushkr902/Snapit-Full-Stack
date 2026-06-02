import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDealsData } from "../components/TodayDeals"
import AddToCartButton from "../components/AddToCartButton"

function DealCardGrid({ product, isCombo }) {
  const navigate = useNavigate()
  const discount = product.price && product.sellingPrice && product.price !== product.sellingPrice
    ? Math.round(((product.price - product.sellingPrice) / product.price) * 100)
    : null

  return (
    <div
      className="bg-white rounded-xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative"
      onClick={() => navigate(`/product/${product._id}`)}
    >
      <div className="w-full h-32 bg-slate-100 flex items-center justify-center p-2">
        <img
          src={product.image?.[0]}
          alt={product.name}
          width={120}
          height={120}
          className="w-full h-full object-contain"
          loading="eager"
          fetchpriority="high"
          onError={e => { e.target.onerror = null; e.target.src = "/placeholder.png" }}
        />
      </div>

      <span className={`absolute top-2 left-2 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ${isCombo ? "bg-purple-500" : "bg-blue-500"}`}>
        {isCombo ? "COMBO" : "B1G1"}
      </span>

      {product.stock > 0 && product.stock <= 10 && (
        <div className="bg-red-50 text-red-600 text-[9px] font-bold text-center py-0.5 tracking-wide">
          ONLY {product.stock} LEFT
        </div>
      )}

      <div className="flex items-center gap-1 px-2 pt-2">
        <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">10 MIN</span>
        {isCombo && discount > 0
          ? <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{discount}% OFF</span>
          : <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">FREE ITEM</span>
        }
      </div>

      <p className="text-xs font-semibold text-slate-800 line-clamp-2 px-2 pt-1 leading-tight">{product.name}</p>
      <p className="text-[10px] text-slate-400 px-2 pb-1">{product.unit}</p>

      <div className="flex items-center justify-between px-2 pb-3 gap-1" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-800">₹{product.sellingPrice ?? product.price}</span>
          {discount > 0 && <span className="text-[10px] text-slate-400 line-through">₹{product.price}</span>}
        </div>
        <div className="w-20">
          <AddToCartButton data={product} />
        </div>
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="rounded-xl border border-slate-100 overflow-hidden animate-pulse">
          <div className="w-full h-32 bg-slate-200" />
          <div className="p-2 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-4/5" />
            <div className="h-3 bg-slate-200 rounded w-3/5" />
            <div className="h-8 bg-slate-200 rounded w-full mt-2" />
          </div>
        </div>
      ))}
    </>
  )
}

const TABS = ["All", "Combo Offers", "Buy 1 Get 1"]

export default function AllDealsPage() {
  const { comboProducts, bogoProducts, loading } = useDealsData()
  const [activeTab, setActiveTab] = useState("All")
  const navigate = useNavigate()

  const allProducts = [
    ...comboProducts.map(p => ({ ...p, _isCombo: true })),
    ...bogoProducts.map(p => ({ ...p, _isCombo: false })),
  ]

  const displayed =
    activeTab === "Combo Offers" ? comboProducts.map(p => ({ ...p, _isCombo: true })) :
    activeTab === "Buy 1 Get 1"  ? bogoProducts.map(p => ({ ...p, _isCombo: false })) :
    allProducts

  return (
    <section className="bg-white min-h-screen pb-24">

      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-slate-100">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-slate-800 text-lg font-bold">←</button>
          <h1 className="text-lg font-extrabold text-slate-800">Today's Deals 🔥</h1>
          <span className="ml-auto text-xs text-slate-400 font-medium">{displayed.length} products</span>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-4 pb-3 flex gap-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-colors ${
                activeTab === tab
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-green-300"
              }`}
            >
              {tab}
              {!loading && (
                <span className="ml-1 opacity-70">
                  ({tab === "All" ? allProducts.length : tab === "Combo Offers" ? comboProducts.length : bogoProducts.length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {loading
            ? <SkeletonGrid />
            : displayed.length > 0
              ? displayed.map(p => <DealCardGrid key={p._id} product={p} isCombo={p._isCombo} />)
              : <p className="col-span-full text-center text-slate-400 text-sm py-16">No deals found</p>
          }
        </div>
      </div>

    </section>
  )
}