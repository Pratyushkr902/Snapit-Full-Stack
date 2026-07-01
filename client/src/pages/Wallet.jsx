import React, { useEffect, useState, useCallback } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import { useGlobalContext } from '../provider/GlobalProvider'

// ─── Styles ────────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');

@keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
@keyframes pulse    { 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.03) } }
@keyframes shimmer  { 0%{ background-position:-400px 0 } 100%{ background-position:400px 0 } }
@keyframes spin     { to { transform:rotate(360deg) } }
@keyframes glow     { 0%,100%{ box-shadow:0 0 20px rgba(234,179,8,.3) } 50%{ box-shadow:0 0 40px rgba(234,179,8,.6) } }

.wallet-root * { font-family:'Sora',sans-serif; box-sizing:border-box; }
.wallet-root { min-height:100vh; background:#f1f5f9; padding-bottom:80px; }

/* Card */
.w-bal-card { animation:fadeUp .45s ease both; border-radius:24px; overflow:hidden; position:relative; }

/* Shimmer */
.shimmer { background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:400px 100%; animation:shimmer 1.4s infinite linear; border-radius:10px; }

/* Tabs */
.w-tab { flex:1; padding:12px 4px; border:none; background:transparent; font-weight:700; font-size:12px; cursor:pointer; color:#94a3b8; border-bottom:3px solid transparent; transition:all .2s; font-family:'Sora',sans-serif; white-space:nowrap; }
.w-tab.active { color:#16a34a; border-bottom-color:#16a34a; }

/* Buttons */
.w-preset { padding:12px 4px; border-radius:14px; border:1.5px solid #e2e8f0; background:#fff; color:#374151; font-weight:700; font-size:13px; cursor:pointer; transition:all .18s; font-family:'Sora',sans-serif; }
.w-preset:hover,.w-preset.sel { border-color:#16a34a; background:#f0fdf4; color:#16a34a; transform:scale(1.04); }

.w-btn-green { width:100%; padding:15px; border-radius:16px; border:none; background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; font-weight:800; font-size:15px; cursor:pointer; transition:all .2s; font-family:'Sora',sans-serif; box-shadow:0 4px 14px rgba(22,163,74,.3); display:flex; align-items:center; justify-content:center; gap:8px; }
.w-btn-green:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(22,163,74,.4); }
.w-btn-green:disabled { background:#e2e8f0; box-shadow:none; cursor:not-allowed; color:#94a3b8; }

.w-btn-blue { width:100%; padding:15px; border-radius:16px; border:2px solid #3b82f6; background:#fff; color:#3b82f6; font-weight:800; font-size:15px; cursor:pointer; transition:all .2s; font-family:'Sora',sans-serif; }
.w-btn-blue:hover:not(:disabled) { background:#eff6ff; transform:translateY(-1px); }
.w-btn-blue:disabled { opacity:.5; cursor:not-allowed; }

/* Transaction rows */
.txn-row { display:flex; justify-content:space-between; align-items:center; padding:13px 0; border-bottom:1px solid #f8fafc; }
.txn-row:last-child { border-bottom:none; }

/* Plus plan cards */
.plan-card { border-radius:20px; border:2px solid #e2e8f0; padding:20px; cursor:pointer; transition:all .22s; position:relative; background:#fff; }
.plan-card:hover { border-color:#eab308; transform:translateY(-2px); box-shadow:0 8px 24px rgba(234,179,8,.15); }
.plan-card.selected { border-color:#eab308; background:linear-gradient(135deg,#fffbeb,#fefce8); box-shadow:0 8px 24px rgba(234,179,8,.2); }
.plan-card.yearly.selected { animation:glow 2s ease-in-out infinite; }

/* Spinner */
.spin-el { width:16px; height:16px; border:2.5px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; flex-shrink:0; }
.spin-el.dark { border-color:rgba(22,163,74,.3); border-top-color:#16a34a; }

/* Input */
.w-input { width:100%; border:2px solid #f1f5f9; border-radius:14px; padding:14px 14px 14px 44px; font-size:20px; font-weight:800; outline:none; color:#0f172a; background:#f8fafc; transition:border-color .2s; font-family:'Sora',sans-serif; }
.w-input:focus { border-color:#16a34a; }
.w-input.blue:focus { border-color:#3b82f6; }
.w-input-plain { width:100%; border:2px solid #f1f5f9; border-radius:14px; padding:13px 14px; font-size:14px; font-weight:600; outline:none; color:#0f172a; background:#f8fafc; transition:border-color .2s; font-family:'Sora',sans-serif; }
.w-input-plain:focus { border-color:#3b82f6; }

/* Mobile safe area */
@media (max-width: 480px) {
  .wallet-root { padding-bottom:100px; }
  .w-bal-num { font-size:38px !important; }
  .w-tab { font-size:11px; padding:11px 2px; }
}
`

// ─── Helpers ───────────────────────────────────────────────────────────────────
const loadRazorpay = () =>
  new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })

const Spinner = ({ dark }) => <span className={`spin-el${dark ? ' dark' : ''}`} />

const Skeleton = () => (
  <div style={{ padding:'16px', maxWidth:'480px', margin:'0 auto' }}>
    <div className="shimmer" style={{ height:'190px', marginBottom:'16px' }} />
    <div className="shimmer" style={{ height:'56px', marginBottom:'12px' }} />
    <div className="shimmer" style={{ height:'300px' }} />
  </div>
)

const PLUS_FEATURES = [
  { icon:'🚀', text:'Free & priority delivery on all orders' },
  { icon:'💰', text:'Exclusive member-only discounts' },
  { icon:'⚡', text:'Early access to flash sales' },
  { icon:'🎁', text:'Monthly surprise reward drops' },
  { icon:'📞', text:'Dedicated priority support' },
  { icon:'✨', text:'Snapit Plus badge on profile' },
]

// ─── Main Component ────────────────────────────────────────────────────────────
const Wallet = () => {
  const [balance,      setBalance]      = useState(0)
  const [transactions, setTransactions] = useState([])
  const [amount,       setAmount]       = useState('')
  const [loading,      setLoading]      = useState(false)
  const [fetching,     setFetching]     = useState(true)
  const [tab,          setTab]          = useState('add')   // 'add' | 'plus' | 'history'
  const [upiId,        setUpiId]        = useState('')
  const [withdrawing,  setWithdrawing]  = useState(false)
  const [razorKey,     setRazorKey]     = useState('')
  const [plusLoading,  setPlusLoading]  = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [isPlusMember, setIsPlusMember] = useState(false)
  const [plusExpiry,   setPlusExpiry]   = useState(null)

  const { } = useGlobalContext() || {}

  // ── Fetch wallet data ────────────────────────────────────────────────────────
  const fetchWallet = useCallback(async () => {
    try {
      const res = await Axios({ url: '/api/wallet/get', method: 'get' })
      if (res.data.success) {
        setBalance(res.data.data.balance)
        setTransactions(res.data.data.transactions || [])
      }
    } catch (err) {
      console.error('Wallet fetch:', err?.response?.data)
    } finally {
      setFetching(false)
    }
  }, [])

  const fetchRazorpayKey = useCallback(async () => {
    try {
      const res = await Axios({ url: '/api/payment/razorpay-key', method: 'get' })
      if (res.data.key) setRazorKey(res.data.key)
    } catch { /* optional */ }
  }, [])

  const fetchPlusStatus = useCallback(async () => {
    try {
      const res = await Axios({ url: '/api/user/profile', method: 'get' })
      const u = res.data.data || res.data
      setIsPlusMember(u.isSnapitPlusMember || false)
      setPlusExpiry(u.snapitPlusExpiresAt || null)
    } catch { /* optional */ }
  }, [])

  useEffect(() => {
    fetchWallet()
    fetchRazorpayKey()
    fetchPlusStatus()
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const numAmount   = Number(amount)
  const bonus       = numAmount >= 500 ? Math.floor(numAmount * 0.05) : 0
  const total       = numAmount + bonus
  const thisMonth   = new Date().getMonth()
  const monthlySpend = transactions
    .filter(t => t.type === 'debit' && new Date(t.date).getMonth() === thisMonth)
    .reduce((s, t) => s + t.amount, 0)

  // ── Add Money via Razorpay ───────────────────────────────────────────────────
  const handleAddMoney = async (customAmount) => {
    const finalAmount = Number(customAmount !== undefined ? customAmount : amount)
    if (!finalAmount || finalAmount <= 0) return toast.error('Enter a valid amount')
    if (finalAmount > 10000)              return toast.error('Maximum limit is ₹10,000')
    if (!razorKey)                        return toast.error('Payment not configured. Contact support.')

    const loaded = await loadRazorpay()
    if (!loaded) return toast.error('Razorpay failed to load. Check your internet.')

    setLoading(true)
    try {
      const orderRes = await Axios({
        url:    '/api/payment/create-order',
        method: 'post',
        data:   { amount: finalAmount }
      })

      if (!orderRes.data.success) {
        toast.error(orderRes.data.message || 'Could not create payment order')
        return
      }

      const order = orderRes.data.order

      const options = {
        key:         razorKey,
        amount:      order.amount,
        currency:    order.currency,
        name:        'Snapit',
        description: 'Wallet Recharge',
        order_id:    order.id,
        redirect: false,
        theme:       { color: '#16a34a' },

        handler: async (response) => {
          try {
            const verifyRes = await Axios({
              url:    '/api/payment/verify-wallet',
              method: 'post',
              data:   {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                amount:              finalAmount
                // ✅ NO userId here — backend reads req.userId from auth cookie
              }
            })
            if (verifyRes.data.success) {
              toast.success(verifyRes.data.message || `₹${finalAmount} added! 🎉`)
              setAmount('')
              if (fetchUser) fetchUser()
              fetchWallet()
            } else {
              toast.error('Payment verification failed. Contact support.')
            }
          } catch {
            toast.error('Verification error. Contact support if money was deducted.')
          } finally {
            setLoading(false)
          }
        },

        modal: {
          ondismiss: () => {
            document.body.style.overflow = "";
            document.body.style.touchAction = "";
            document.documentElement.style.overflow = "";
            document.documentElement.style.touchAction = "";
            toast('Payment cancelled')
            setLoading(false)
          }
        }
      }

      new window.Razorpay(options).open()

    } catch (err) {
      toast.error(err?.response?.data?.message || 'Payment initiation failed')
      setLoading(false)
    }
  }

  // ── Withdraw ─────────────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!upiId.trim())       return toast.error('Enter your UPI ID')
    if (numAmount <= 0)      return toast.error('Enter a valid amount')
    if (numAmount > balance) return toast.error('Insufficient wallet balance')
    if (numAmount < 50)      return toast.error('Minimum withdrawal is ₹50')

    setWithdrawing(true)
    try {
      const res = await Axios({
        url: '/api/wallet/withdraw', method: 'post',
        data: { amount: numAmount, upiId: upiId.trim() }
      })
      if (res.data.success) {
        toast.success(res.data.message || `₹${numAmount} withdrawal initiated!`)
        setAmount(''); setUpiId('')
        if (fetchUser) fetchUser()
        fetchWallet()
      } else {
        toast.error(res.data.message || 'Withdrawal failed')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Withdrawal failed.')
    } finally {
      setWithdrawing(false)
    }
  }

  // ── Snapit Plus Subscribe ────────────────────────────────────────────────────
  const handlePlusSubscribe = async () => {
    if (!razorKey) return toast.error('Payment not configured. Contact support.')

    const loaded = await loadRazorpay()
    if (!loaded) return toast.error('Razorpay failed to load. Check your internet.')

    setPlusLoading(true)
    try {
      const orderRes = await Axios({
        url:    '/api/payment/subscribe-snapitplus',
        method: 'post',
        data:   { planType: selectedPlan }
        // ✅ NO userId — backend reads req.userId from auth cookie
      })

      if (!orderRes.data.success) {
        toast.error(orderRes.data.message || 'Could not create subscription order')
        return
      }

      const order = orderRes.data.order
      const planAmount = orderRes.data.amount

      const options = {
        key:         razorKey,
        amount:      order.amount,
        currency:    order.currency,
        name:        'Snapit Plus',
        description: `${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`,
        order_id:    order.id,
        redirect: false,
        theme:       { color: '#eab308' },

        handler: async (response) => {
          try {
            const verifyRes = await Axios({
              url:    '/api/payment/verify-subscription',
              method: 'post',
              data:   {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                planType:            selectedPlan
                // ✅ NO userId — backend reads req.userId from auth cookie
              }
            })
            if (verifyRes.data.success) {
              toast.success(verifyRes.data.message || 'Welcome to Snapit Plus! ✨')
              setIsPlusMember(true)
              setPlusExpiry(verifyRes.data.data?.expiresAt)
              if (fetchUser) fetchUser()
            } else {
              toast.error('Subscription verification failed. Contact support.')
            }
          } catch {
            toast.error('Verification error. Contact support if payment was deducted.')
          } finally {
            setPlusLoading(false)
          }
        },

        modal: {
          ondismiss: () => {
            document.body.style.overflow = "";
            document.body.style.touchAction = "";
            document.documentElement.style.overflow = "";
            document.documentElement.style.touchAction = "";
            toast('Subscription cancelled')
            setPlusLoading(false)
          }
        }
      }

      new window.Razorpay(options).open()

    } catch (err) {
      toast.error(err?.response?.data?.message || 'Subscription initiation failed')
      setPlusLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  if (fetching) return (
    <div className="wallet-root">
      <style>{STYLES}</style>
      <Skeleton />
    </div>
  )

  return (
    <div className="wallet-root">
      <style>{STYLES}</style>

      <div style={{ maxWidth:'480px', margin:'0 auto', padding:'16px' }}>

        {/* ── Balance Card ── */}
        <div className="w-bal-card" style={{
          background: 'linear-gradient(135deg,#16a34a 0%,#14532d 100%)',
          padding:    '28px 22px 24px',
          marginBottom:'16px',
          color:      '#fff',
          boxShadow:  '0 12px 32px -4px rgba(22,163,74,.4)'
        }}>
          {/* decorative */}
          <div style={{ position:'absolute', top:'-24px', right:'-24px', width:'130px', height:'130px', borderRadius:'50%', background:'rgba(255,255,255,.07)' }} />
          <div style={{ position:'absolute', bottom:'-16px', left:'-16px', width:'90px', height:'90px', borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <p style={{ fontSize:'11px', fontWeight:'700', opacity:.75, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'1.5px' }}>
                Snapit Wallet
              </p>
              <h1 className="w-bal-num" style={{ fontSize:'44px', fontWeight:'900', margin:'0 0 4px', letterSpacing:'-2px', lineHeight:1 }}>
                ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits:2 })}
              </h1>
            </div>

            {/* Plus badge */}
            {isPlusMember && (
              <div style={{ background:'linear-gradient(135deg,#eab308,#ca8a04)', borderRadius:'12px', padding:'8px 12px', textAlign:'center', flexShrink:0 }}>
                <p style={{ fontSize:'10px', fontWeight:'800', margin:0, color:'#fff', letterSpacing:'.5px' }}>SNAPIT</p>
                <p style={{ fontSize:'13px', fontWeight:'900', margin:0, color:'#fff' }}>PLUS ✨</p>
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:'8px', marginTop:'12px', flexWrap:'wrap' }}>
            <div style={{ background:'rgba(255,255,255,.15)', borderRadius:'50px', padding:'5px 12px', fontSize:'11px', fontWeight:'700', border:'1px solid rgba(255,255,255,.2)' }}>
              📉 This month: ₹{monthlySpend.toLocaleString('en-IN')} spent
            </div>
            {isPlusMember && plusExpiry && (
              <div style={{ background:'rgba(234,179,8,.3)', borderRadius:'50px', padding:'5px 12px', fontSize:'11px', fontWeight:'700', border:'1px solid rgba(234,179,8,.4)', color:'#fef08a' }}>
                ✨ Plus until {new Date(plusExpiry).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Presets ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'14px' }}>
          {[100,200,500,1000].map(v => (
            <button key={v} className={`w-preset${numAmount===v?' sel':''}`} onClick={() => setAmount(v)}>
              ₹{v}
            </button>
          ))}
        </div>

        {/* ── Tab Panel ── */}
        <div style={{ background:'#fff', borderRadius:'20px', border:'1px solid #f1f5f9', overflow:'hidden', marginBottom:'14px', boxShadow:'0 4px 6px -1px rgba(0,0,0,.04)' }}>

          {/* Tab headers */}
          <div style={{ display:'flex', borderBottom:'1px solid #f1f5f9' }}>
            {[
              { key:'add',     label:'➕ Add Money' },
              { key:'plus',    label:'✨ Snapit Plus' },
              { key:'history', label:'📋 History'    },
            ].map(t => (
              <button key={t.key} className={`w-tab${tab===t.key?' active':''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding:'18px' }}>

            {/* ── ADD MONEY ── */}
            {tab === 'add' && (
              <div>
                <div style={{ position:'relative', marginBottom:'12px' }}>
                  <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontWeight:'800', fontSize:'20px' }}>₹</span>
                  <input type="number" placeholder="Enter amount" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-input"
                    style={{ paddingLeft:'40px' }}
                  />
                </div>

                {bonus > 0 && (
                  <div style={{ background:'#f0fdf4', border:'1px dashed #22c55e', borderRadius:'12px', padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                    <span style={{ fontSize:'18px' }}>⚡</span>
                    <div>
                      <p style={{ color:'#15803d', fontSize:'13px', fontWeight:'700', margin:0 }}>5% Bonus Applied!</p>
                      <p style={{ color:'#16a34a', fontSize:'12px', margin:'2px 0 0' }}>₹{numAmount} + ₹{bonus} bonus = <strong>₹{total} total</strong></p>
                    </div>
                  </div>
                )}

                <button className="w-btn-green" onClick={() => handleAddMoney()} disabled={loading || !amount || numAmount <= 0} style={{ marginBottom:'10px' }}>
                  {loading ? <><Spinner />Processing...</> : `💳 Pay ₹${numAmount || '—'} via Razorpay`}
                </button>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                  {[{label:'Add ₹100',value:100},{label:'Add ₹200',value:200},{label:'₹500 +5%',value:500}].map(item => (
                    <button key={item.value} className="w-preset" onClick={() => handleAddMoney(item.value)} disabled={loading} style={{ fontSize:'12px', padding:'11px 4px' }}>
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Withdraw section below add */}
                <div style={{ marginTop:'18px', paddingTop:'18px', borderTop:'1px solid #f1f5f9' }}>
                  <p style={{ fontSize:'12px', fontWeight:'700', color:'#64748b', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'.8px' }}>🏦 Withdraw to UPI</p>

                  <div style={{ background:'#eff6ff', borderRadius:'12px', padding:'10px 12px', marginBottom:'12px', display:'flex', gap:'8px' }}>
                    <span style={{ fontSize:'14px' }}>ℹ️</span>
                    <p style={{ color:'#1d4ed8', fontSize:'12px', fontWeight:'600', margin:0 }}>Processed in 2–4 business days. Min ₹50.</p>
                  </div>

                  <div style={{ position:'relative', marginBottom:'10px' }}>
                    <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontWeight:'800', fontSize:'20px' }}>₹</span>
                    <input type="number" placeholder="Amount to withdraw" value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-input blue"
                      style={{ paddingLeft:'40px' }}
                    />
                  </div>

                  <input type="text" placeholder="UPI ID (e.g. name@upi)" value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    className="w-input-plain"
                    style={{ marginBottom:'10px' }}
                  />

                  {numAmount > balance && numAmount > 0 && (
                    <p style={{ color:'#ef4444', fontSize:'12px', fontWeight:'700', marginBottom:'10px' }}>⚠️ Exceeds wallet balance</p>
                  )}

                  <button className="w-btn-blue" onClick={handleWithdraw} disabled={withdrawing || !upiId || numAmount <= 0 || numAmount > balance}>
                    {withdrawing ? <><Spinner dark />Processing...</> : `🏦 Withdraw ₹${numAmount || '—'}`}
                  </button>
                </div>
              </div>
            )}

            {/* ── SNAPIT PLUS ── */}
            {tab === 'plus' && (
              <div>
                {isPlusMember ? (
                  /* Active member state */
                  <div>
                    <div style={{ background:'linear-gradient(135deg,#fefce8,#fef9c3)', border:'2px solid #eab308', borderRadius:'18px', padding:'20px', marginBottom:'16px', textAlign:'center' }}>
                      <div style={{ fontSize:'48px', marginBottom:'8px' }}>👑</div>
                      <h3 style={{ fontWeight:'900', color:'#92400e', fontSize:'20px', margin:'0 0 4px' }}>You're a Snapit Plus Member!</h3>
                      {plusExpiry && (
                        <p style={{ color:'#b45309', fontSize:'13px', fontWeight:'600', margin:'4px 0 0' }}>
                          Active until {new Date(plusExpiry).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}
                        </p>
                      )}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                      {PLUS_FEATURES.map((f, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#f0fdf4', borderRadius:'12px' }}>
                          <span style={{ fontSize:'18px' }}>{f.icon}</span>
                          <span style={{ fontSize:'13px', fontWeight:'600', color:'#166534' }}>{f.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Subscription plan picker */
                  <div>
                    <div style={{ textAlign:'center', marginBottom:'16px' }}>
                      <p style={{ fontSize:'12px', fontWeight:'700', color:'#eab308', textTransform:'uppercase', letterSpacing:'1px', margin:'0 0 4px' }}>✨ Upgrade Now</p>
                      <h3 style={{ fontSize:'20px', fontWeight:'900', color:'#0f172a', margin:'0 0 4px' }}>Snapit Plus</h3>
                      <p style={{ fontSize:'13px', color:'#64748b', fontWeight:'600', margin:0 }}>Unlock premium benefits for every order</p>
                    </div>

                    {/* Features list */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'7px', marginBottom:'16px' }}>
                      {PLUS_FEATURES.map((f, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <span style={{ fontSize:'15px' }}>{f.icon}</span>
                          <span style={{ fontSize:'13px', fontWeight:'600', color:'#374151' }}>{f.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Plan cards */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>

                      <div className={`plan-card${selectedPlan==='monthly'?' selected':''}`} onClick={() => setSelectedPlan('monthly')}>
                        {selectedPlan==='monthly' && <div style={{ position:'absolute', top:'10px', right:'10px', width:'18px', height:'18px', background:'#eab308', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:'#fff' }}>✓</div>}
                        <p style={{ fontSize:'11px', fontWeight:'700', color:'#64748b', margin:'0 0 6px', textTransform:'uppercase' }}>Monthly</p>
                        <p style={{ fontSize:'26px', fontWeight:'900', color:'#0f172a', margin:'0 0 2px', lineHeight:1 }}>₹99</p>
                        <p style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'600', margin:0 }}>/month</p>
                      </div>

                      <div className={`plan-card yearly${selectedPlan==='yearly'?' selected':''}`} onClick={() => setSelectedPlan('yearly')}>
                        <div style={{ position:'absolute', top:'-8px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#eab308,#ca8a04)', borderRadius:'50px', padding:'3px 10px', fontSize:'10px', fontWeight:'800', color:'#fff', whiteSpace:'nowrap' }}>
                          SAVE 25%
                        </div>
                        {selectedPlan==='yearly' && <div style={{ position:'absolute', top:'10px', right:'10px', width:'18px', height:'18px', background:'#eab308', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:'#fff' }}>✓</div>}
                        <p style={{ fontSize:'11px', fontWeight:'700', color:'#64748b', margin:'16px 0 6px', textTransform:'uppercase' }}>Yearly</p>
                        <p style={{ fontSize:'26px', fontWeight:'900', color:'#0f172a', margin:'0 0 2px', lineHeight:1 }}>₹899</p>
                        <p style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'600', margin:0 }}>/year</p>
                      </div>
                    </div>

                    <button
                      onClick={handlePlusSubscribe}
                      disabled={plusLoading}
                      style={{
                        width:'100%', padding:'15px', borderRadius:'16px', border:'none',
                        background: plusLoading ? '#e2e8f0' : 'linear-gradient(135deg,#eab308,#ca8a04)',
                        color: plusLoading ? '#94a3b8' : '#fff',
                        fontWeight:'800', fontSize:'15px', cursor: plusLoading ? 'not-allowed' : 'pointer',
                        fontFamily:'Sora,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                        boxShadow: plusLoading ? 'none' : '0 4px 14px rgba(234,179,8,.4)',
                        transition:'all .2s'
                      }}
                    >
                      {plusLoading
                        ? <><Spinner />Processing...</>
                        : `✨ Subscribe ${selectedPlan==='yearly'?'Yearly ₹899':'Monthly ₹99'} via Razorpay`
                      }
                    </button>

                    <p style={{ textAlign:'center', fontSize:'11px', color:'#94a3b8', fontWeight:'600', marginTop:'10px' }}>
                      Cancel anytime · Auto-renews · Secured by Razorpay
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY ── */}
            {tab === 'history' && (
              <div>
                {transactions.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'36px 0' }}>
                    <div style={{ fontSize:'44px', marginBottom:'10px', opacity:.35 }}>🏜️</div>
                    <p style={{ color:'#94a3b8', fontSize:'14px', fontWeight:'700' }}>No transactions yet</p>
                    <p style={{ color:'#cbd5e1', fontSize:'12px', fontWeight:'600' }}>Add money to get started</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
                      <div style={{ flex:1, background:'#f0fdf4', borderRadius:'12px', padding:'10px', textAlign:'center' }}>
                        <p style={{ fontSize:'10px', color:'#166534', fontWeight:'700', margin:'0 0 2px' }}>ADDED</p>
                        <p style={{ fontSize:'15px', fontWeight:'900', color:'#16a34a', margin:0 }}>
                          ₹{transactions.filter(t=>t.type==='credit').reduce((s,t)=>s+t.amount,0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div style={{ flex:1, background:'#fef2f2', borderRadius:'12px', padding:'10px', textAlign:'center' }}>
                        <p style={{ fontSize:'10px', color:'#991b1b', fontWeight:'700', margin:'0 0 2px' }}>SPENT</p>
                        <p style={{ fontSize:'15px', fontWeight:'900', color:'#ef4444', margin:0 }}>
                          ₹{transactions.filter(t=>t.type==='debit').reduce((s,t)=>s+t.amount,0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {transactions.map((txn, i) => (
                      <div key={i} className="txn-row">
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{
                            width:'38px', height:'38px', borderRadius:'12px', flexShrink:0,
                            background: txn.type==='credit' ? '#dcfce7' : '#fee2e2',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px'
                          }}>
                            {txn.type==='credit' ? '💰' : '🛒'}
                          </div>
                          <div>
                            <p style={{ fontSize:'12px', fontWeight:'700', color:'#1e293b', margin:'0 0 2px' }}>{txn.description}</p>
                            <p style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'600', margin:0 }}>
                              {new Date(txn.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                              {' · '}
                              {new Date(txn.date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                            </p>
                          </div>
                        </div>
                        <span style={{ fontWeight:'800', fontSize:'14px', color:txn.type==='credit'?'#16a34a':'#ef4444', flexShrink:0, marginLeft:'8px' }}>
                          {txn.type==='credit'?'+':'-'}₹{Number(txn.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        <p style={{ textAlign:'center', fontSize:'11px', color:'#94a3b8', fontWeight:'600' }}>
          🔒 Secured by Razorpay · 256-bit encryption
        </p>

      </div>
    </div>
  )
}

export default Wallet