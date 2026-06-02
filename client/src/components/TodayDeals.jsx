import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Axios from "../utils/Axios"
import SummaryApi from "../common/SummaryApi"
import toast from "react-hot-toast"

// ── Constants ────────────────────────────────────────────────────────────────
const GREEN  = "#1a7c3e"
const ORANGE = "#E8520A"
const BLUE   = "#1a5c9e"
const PURPLE = "#7B3FA0"

// Keywords used to detect combo vs B1G1 from the unit field
const COMBO_KEYWORDS = ["combo", "pack of 2", "pack of 3", "pack of 4", "bundle", "duo", "trio"]
const BOGO_KEYWORDS  = ["b1g1", "buy 1 get 1", "buy one get one", "bogo", "free item", "1+1"]

const isComboUnit  = (unit = "") => COMBO_KEYWORDS.some(k => unit.toLowerCase().includes(k))
const isBogoUnit   = (unit = "") => BOGO_KEYWORDS.some(k => unit.toLowerCase().includes(k))

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root:        { fontFamily: "'Inter', sans-serif", background: "#fff", paddingBottom: 8 },
  sectionHead: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 14px 12px" },
  sectionTitle:{ fontSize:22, fontWeight:800, color:"#111", letterSpacing:-0.3 },
  seeAllBtn:   { display:"flex", alignItems:"center", gap:6, background:GREEN, color:"#fff", fontSize:13, fontWeight:600, borderRadius:22, padding:"7px 16px", border:"none", cursor:"pointer" },
  timerStrip:  { display:"flex", alignItems:"center", gap:8, margin:"0 14px 14px", background:"#FFF4EC", border:"1px solid #FDDBB8", borderRadius:10, padding:"9px 13px" },
  timerLabel:  { fontSize:12, fontWeight:700, color:"#7A3E0A", letterSpacing:0.4 },
  timerUnits:  { display:"flex", alignItems:"center", gap:4, marginLeft:"auto" },
  tUnit:       { background:ORANGE, color:"#fff", fontSize:13, fontWeight:800, borderRadius:6, padding:"3px 8px", minWidth:30, textAlign:"center" },
  tColon:      { fontWeight:800, color:ORANGE, fontSize:14 },
  subRow:      { display:"flex", alignItems:"center", padding:"4px 14px 10px" },
  subTitle:    { fontSize:15, fontWeight:700, color:"#111" },
  subLabelCombo:{ fontSize:11, fontWeight:700, color:PURPLE, background:"#F3EAFC", borderRadius:5, padding:"2px 8px", marginLeft:8 },
  subLabelBogo: { fontSize:11, fontWeight:700, color:BLUE,   background:"#E6F0FC", borderRadius:5, padding:"2px 8px", marginLeft:8 },
  scrollWrap:  { display:"flex", gap:12, overflowX:"auto", padding:"0 14px 4px", scrollbarWidth:"none" },
  card:        { flex:"0 0 158px", background:"#fff", border:"1px solid #e8e8e8", borderRadius:12, overflow:"hidden", position:"relative" },
  cardImg:     { width:"100%", height:110, display:"flex", alignItems:"center", justifyContent:"center", background:"#f9f9f9", padding:8 },
  onlyLeft:    { position:"absolute", top:88, left:0, right:0, background:"#FFEAEA", color:"#C0392B", fontSize:10, fontWeight:700, textAlign:"center", padding:"3px 0", letterSpacing:0.3 },
  topBadge:    { position:"absolute", top:8, left:8, borderRadius:6, fontSize:10, fontWeight:700, padding:"3px 8px", color:"#fff" },
  tagRow:      { display:"flex", alignItems:"center", gap:5, padding:"8px 9px 4px" },
  tagMin:      { background:GREEN,  color:"#fff", fontSize:10, fontWeight:700, borderRadius:5, padding:"2px 7px" },
  tagOff:      { background:ORANGE, color:"#fff", fontSize:10, fontWeight:700, borderRadius:5, padding:"2px 7px" },
  tagBogo:     { background:BLUE,   color:"#fff", fontSize:10, fontWeight:700, borderRadius:5, padding:"2px 7px" },
  cardName:    { fontSize:13, fontWeight:600, color:"#111", padding:"2px 9px 2px", lineHeight:1.3 },
  cardQty:     { fontSize:12, color:"#888", padding:"1px 9px 5px" },
  cardFooter:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 9px 10px" },
  priceCol:    { display:"flex", flexDirection:"column" },
  price:       { fontSize:15, fontWeight:800, color:"#111" },
  mrp:         { fontSize:11, color:"#aaa", textDecoration:"line-through" },
  qtyCtrl:     { display:"flex", alignItems:"center", background:GREEN, borderRadius:8, overflow:"hidden" },
  qtyBtn:      { background:GREEN, border:"none", color:"#fff", fontSize:18, fontWeight:700, width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  qtyNum:      { background:"#fff", color:GREEN, fontSize:13, fontWeight:800, width:24, height:28, display:"flex", alignItems:"center", justifyContent:"center" },
  divider:     { height:8, background:"#F4F4F4", margin:"12px 0" },
  emptyText:   { fontSize:13, color:"#aaa", padding:"8px 14px 4px" },
  skeleton:    { flex:"0 0 158px", height:220, background:"#f0f0f0", borderRadius:12, animation:"pulse 1.5s ease-in-out infinite" },
}

// ── Countdown Timer ──────────────────────────────────────────────────────────
function CountdownTimer({ initialSeconds }) {
  const [secs, setSecs] = useState(initialSeconds)
  useEffect(() => {
    const id = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])
  const h = String(Math.floor(secs / 3600)).padStart(2, "0")
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0")
  const s = String(secs % 60).padStart(2, "0")
  return (
    <div style={S.timerStrip}>
      <span style={{ fontSize:15, color:ORANGE }}>⏱</span>
      <span style={S.timerLabel}>ENDS IN</span>
      <div style={S.timerUnits}>
        <span style={S.tUnit}>{h}</span><span style={S.tColon}>:</span>
        <span style={S.tUnit}>{m}</span><span style={S.tColon}>:</span>
        <span style={S.tUnit}>{s}</span>
      </div>
    </div>
  )
}

// ── Qty Control ──────────────────────────────────────────────────────────────
function QtyControl({ productId, onAdd }) {
  const [qty, setQty] = useState(1)
  const handleAdd = () => { setQty(q => q + 1); onAdd && onAdd(productId) }
  const handleMinus = () => setQty(q => Math.max(1, q - 1))
  return (
    <div style={S.qtyCtrl}>
      <button style={S.qtyBtn} onClick={handleMinus}>−</button>
      <span style={S.qtyNum}>{qty}</span>
      <button style={S.qtyBtn} onClick={handleAdd}>+</button>
    </div>
  )
}

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, isCombo }) {
  const navigate = useNavigate()
  const badgeBg = isCombo ? PURPLE : BLUE
  const discount = product.price && product.sellingPrice
    ? Math.round(((product.price - product.sellingPrice) / product.price) * 100)
    : null

  const handleAddToCart = async (productId) => {
    try {
      const res = await Axios({ ...SummaryApi.addTocart, data: { productId, quantity: 1 } })
      if (res.data.success) toast.success("Added to cart!")
    } catch {
      toast.error("Login to add to cart")
    }
  }

  return (
    <div style={S.card} onClick={() => navigate(`/product/${product._id}`)} className="cursor-pointer">
      {/* Image */}
      <div style={S.cardImg}>
        <img
          src={product.image?.[0]}
          alt={product.name}
          style={{ width:"100%", height:"100%", objectFit:"contain" }}
          onError={e => { e.target.onerror = null; e.target.src = "/placeholder.png" }}
        />
      </div>

      {/* Top badge */}
      <span style={{ ...S.topBadge, background: badgeBg }}>
        {isCombo ? "COMBO" : "B1G1"}
      </span>

      {/* Low stock */}
      {product.stock <= 10 && product.stock > 0 && (
        <div style={S.onlyLeft}>ONLY {product.stock} LEFT</div>
      )}

      {/* Tags */}
      <div style={S.tagRow}>
        <span style={S.tagMin}>10 MIN</span>
        {isCombo && discount > 0
          ? <span style={S.tagOff}>{discount}% OFF</span>
          : <span style={S.tagBogo}>FREE ITEM</span>
        }
      </div>

      {/* Name & unit */}
      <div style={S.cardName}>{product.name}</div>
      <div style={S.cardQty}>{product.unit}</div>

      {/* Price + qty */}
      <div style={S.cardFooter} onClick={e => e.stopPropagation()}>
        <div style={S.priceCol}>
          <span style={S.price}>₹{product.sellingPrice ?? product.price}</span>
          {product.price && product.sellingPrice && product.price !== product.sellingPrice && (
            <span style={S.mrp}>₹{product.price}</span>
          )}
        </div>
        <QtyControl productId={product._id} onAdd={handleAddToCart} />
      </div>
    </div>
  )
}

// ── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={S.scrollWrap}>
      {[1,2,3].map(i => <div key={i} style={S.skeleton} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function TodayDeals() {
  const [comboProducts, setComboProducts] = useState([])
  const [bogoProducts,  setBogoProducts]  = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDeals()
  }, [])

  const fetchDeals = async () => {
    try {
      setLoading(true)
      // Fetch all products — paginate through pages until we have enough deals
      let page = 1
      let allProducts = []
      let hasMore = true

      while (hasMore && allProducts.length < 200) {
        const res = await Axios({
          ...SummaryApi.getProduct,
          data: { page, limit: 100 }
        })
        const data = res.data?.data ?? []
        allProducts = [...allProducts, ...data]
        hasMore = data.length === 100
        page++
      }

      const combos = allProducts.filter(p => isComboUnit(p.unit))
      const bogos  = allProducts.filter(p => isBogoUnit(p.unit))

      setComboProducts(combos)
      setBogoProducts(bogos)
    } catch (err) {
      console.error("TodayDeals fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Don't render the section at all if no deals found after loading
  if (!loading && comboProducts.length === 0 && bogoProducts.length === 0) return null

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.sectionHead}>
        <span style={S.sectionTitle}>Today's Deals 🔥</span>
        <button style={S.seeAllBtn} onClick={() => navigate("/deals")}>
          See All →
        </button>
      </div>

      {/* Countdown */}
      <CountdownTimer initialSeconds={8 * 3600 + 42 * 60 + 17} />

      {/* ── Combo Offers ── */}
      {(loading || comboProducts.length > 0) && (
        <>
          <div style={S.subRow}>
            <span style={S.subTitle}>Combo Offers</span>
            <span style={S.subLabelCombo}>SAVE MORE</span>
          </div>
          {loading
            ? <SkeletonRow />
            : <div style={S.scrollWrap}>
                {comboProducts.map(p => (
                  <ProductCard key={p._id} product={p} isCombo={true} />
                ))}
              </div>
          }
        </>
      )}

      {/* ── Buy 1 Get 1 ── */}
      {(loading || bogoProducts.length > 0) && (
        <>
          <div style={S.divider} />
          <div style={S.subRow}>
            <span style={S.subTitle}>Buy 1 Get 1 Free</span>
            <span style={S.subLabelBogo}>FREE ITEM</span>
          </div>
          {loading
            ? <SkeletonRow />
            : <div style={S.scrollWrap}>
                {bogoProducts.map(p => (
                  <ProductCard key={p._id} product={p} isCombo={false} />
                ))}
              </div>
          }
        </>
      )}
    </div>
  )
}