import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import { useGlobalContext } from '../provider/GlobalProvider'

// ─────────────────────────────────────────────
//  SNAPIT WALLET  –  Enhanced Version
//  Features added:
//    ✅ Razorpay real payment integration
//    ✅ Withdraw / Refund to bank option
//    ✅ Animated balance card
//    ✅ Tabbed UI  (Add Money | Withdraw | History)
//    ✅ Bonus preview (5% on ₹500+)
//    ✅ Better empty-state & loading skeleton
//    ✅ Monthly spend summary
// ─────────────────────────────────────────────

// ── Inline keyframes injected once ──────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');

@keyframes fadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
@keyframes pulse    { 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.04) } }
@keyframes shimmer  { 0%{ background-position:-400px 0 } 100%{ background-position:400px 0 } }
@keyframes spin     { to { transform: rotate(360deg) } }

.wallet-page * { font-family: 'Sora', sans-serif; box-sizing: border-box; }

.wallet-card   { animation: fadeUp .5s ease both; }
.pulse-balance { animation: pulse 2.5s ease-in-out infinite; }

.shimmer-line {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 8px;
}

.tab-btn {
  flex: 1; padding: 11px 8px; border: none; background: transparent;
  font-weight: 700; font-size: 13px; cursor: pointer;
  color: #94a3b8; border-bottom: 3px solid transparent;
  transition: all .2s; font-family: 'Sora', sans-serif;
}
.tab-btn.active { color: #16a34a; border-bottom-color: #16a34a; }

.quick-btn {
  padding: 13px 4px; border-radius: 16px; border: 1.5px solid #e5e7eb;
  background: white; color: #374151; font-weight: 700; font-size: 14px;
  cursor: pointer; transition: all .18s; font-family: 'Sora', sans-serif;
}
.quick-btn:hover, .quick-btn.selected {
  border-color: #16a34a; background: #f0fdf4; color: #16a34a; transform: scale(1.05);
}

.main-btn {
  width: 100%; padding: 16px; border-radius: 18px; border: none;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: white; font-weight: 800; font-size: 16px;
  cursor: pointer; transition: all .2s; font-family: 'Sora', sans-serif;
  box-shadow: 0 4px 14px rgba(22,163,74,.3);
}
.main-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(22,163,74,.4); }
.main-btn:disabled { background: #e2e8f0; box-shadow: none; cursor: not-allowed; }

.withdraw-btn {
  width: 100%; padding: 16px; border-radius: 18px; border: 2px solid #3b82f6;
  background: white; color: #3b82f6; font-weight: 800; font-size: 16px;
  cursor: pointer; transition: all .2s; font-family: 'Sora', sans-serif;
}
.withdraw-btn:hover:not(:disabled) { background: #eff6ff; transform: translateY(-1px); }
.withdraw-btn:disabled { opacity: .5; cursor: not-allowed; }

.txn-row { display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid #f8fafc; transition: background .15s; }
.txn-row:last-child { border-bottom: none; }
.txn-row:hover { background: #fafafa; border-radius: 12px; padding-left: 8px; padding-right: 8px; }

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
`

// ── Razorpay loader helper ────────────────────
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

// ── Skeleton loader ───────────────────────────
const Skeleton = () => (
  <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
    <div className="shimmer-line" style={{ height: '200px', marginBottom: '16px' }} />
    <div className="shimmer-line" style={{ height: '60px', marginBottom: '12px' }} />
    <div className="shimmer-line" style={{ height: '160px' }} />
  </div>
)

// ─────────────────────────────────────────────
const Wallet = () => {
  const [balance,      setBalance]      = useState(0)
  const [transactions, setTransactions] = useState([])
  const [amount,       setAmount]       = useState('')
  const [loading,      setLoading]      = useState(false)
  const [fetching,     setFetching]     = useState(true)
  const [tab,          setTab]          = useState('add')       // 'add' | 'withdraw' | 'history'
  const [upiId,        setUpiId]        = useState('')
  const [withdrawing,  setWithdrawing]  = useState(false)
  const [razorKey,     setRazorKey]     = useState('')

  const { fetchUser } = useGlobalContext()

  // ── Fetch wallet + Razorpay key ─────────────
  const fetchWallet = async () => {
    try {
      const res = await Axios({ url: '/api/wallet/get', method: 'get' })
      if (res.data.success) {
        setBalance(res.data.data.balance)
        setTransactions(res.data.data.transactions || [])
      }
    } catch (err) {
      console.log('Wallet fetch error:', err?.response?.data)
    } finally {
      setFetching(false)
    }
  }

  const fetchRazorpayKey = async () => {
    try {
      const res = await Axios({ url: '/api/payment/razorpay-key', method: 'get' })
      if (res.data.key) setRazorKey(res.data.key)
    } catch {
      // Razorpay key endpoint optional — will fall back to direct add
    }
  }

  useEffect(() => {
    fetchWallet()
    fetchRazorpayKey()
  }, [])

  // ── Derived ──────────────────────────────────
  const numAmount = Number(amount)
  const bonus     = numAmount >= 500 ? Math.floor(numAmount * 0.05) : 0
  const total     = numAmount + bonus

  // Monthly spend from transactions
  const thisMonth = new Date().getMonth()
  const monthlySpend = transactions
    .filter(t => t.type === 'debit' && new Date(t.date).getMonth() === thisMonth)
    .reduce((s, t) => s + t.amount, 0)

  // ── Add money (direct — no Razorpay) ─────────
  const handleDirectAdd = async (customAmount) => {
    const finalAmount = Number(customAmount !== undefined ? customAmount : amount)
    if (!finalAmount || finalAmount <= 0) return toast.error('Enter a valid amount')
    if (finalAmount > 10000)              return toast.error('Maximum limit is ₹10,000')

    setLoading(true)
    try {
      const res = await Axios({ url: '/api/wallet/add-money', method: 'post', data: { amount: finalAmount } })
      if (res.data.success) {
        toast.success(res.data.message || `₹${finalAmount} added successfully!`)
        setAmount('')
        if (fetchUser) fetchUser()
        fetchWallet()
      } else {
        toast.error(res.data.message || 'Failed to add money')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed. Please login again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Add money via Razorpay ────────────────────
  const handleRazorpayAdd = async (customAmount) => {
    const finalAmount = Number(customAmount !== undefined ? customAmount : amount)
    if (!finalAmount || finalAmount <= 0) return toast.error('Enter a valid amount')
    if (finalAmount > 10000)              return toast.error('Maximum limit is ₹10,000')

    const loaded = await loadRazorpay()
    if (!loaded) return toast.error('Razorpay failed to load. Check your internet.')

    setLoading(true)
    try {
      // Step 1 — Create order on your backend
      const orderRes = await Axios({
        url:    '/api/payment/create-order',
        method: 'post',
        data:   { amount: finalAmount, currency: 'INR', receipt: `wallet_${Date.now()}` }
      })

      if (!orderRes.data.success) {
        toast.error(orderRes.data.message || 'Could not create payment order')
        setLoading(false)
        return
      }

      const order = orderRes.data.order

      // Step 2 — Open Razorpay checkout
      const options = {
        key:         razorKey || orderRes.data.key,
        amount:      order.amount,          // in paise
        currency:    order.currency,
        name:        'Snapit',
        description: 'Wallet Recharge',
        order_id:    order.id,
        theme:       { color: '#16a34a' },
        prefill:     { name: '', email: '', contact: '' },

        handler: async (response) => {
          // Step 3 — Verify payment on backend & credit wallet
          try {
            const verifyRes = await Axios({
              url:    '/api/payment/verify-wallet',
              method: 'post',
              data:   {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                amount:              finalAmount
              }
            })
            if (verifyRes.data.success) {
              toast.success(`₹${finalAmount} added to wallet! 🎉`)
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
            toast('Payment cancelled')
            setLoading(false)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (err) {
      toast.error(err?.response?.data?.message || 'Payment initiation failed')
      setLoading(false)
    }
  }

  // Use Razorpay if key available, else direct
  const handleAddMoney = (customAmount) =>
    razorKey ? handleRazorpayAdd(customAmount) : handleDirectAdd(customAmount)

  // ── Withdraw to bank / UPI ────────────────────
  const handleWithdraw = async () => {
    if (!upiId.trim())       return toast.error('Enter your UPI ID')
    if (numAmount <= 0)      return toast.error('Enter a valid amount')
    if (numAmount > balance) return toast.error('Insufficient wallet balance')
    if (numAmount < 50)      return toast.error('Minimum withdrawal is ₹50')

    setWithdrawing(true)
    try {
      const res = await Axios({
        url:    '/api/wallet/withdraw',
        method: 'post',
        data:   { amount: numAmount, upiId: upiId.trim() }
      })
      if (res.data.success) {
        toast.success(res.data.message || `₹${numAmount} withdrawal initiated!`)
        setAmount('')
        setUpiId('')
        if (fetchUser) fetchUser()
        fetchWallet()
      } else {
        toast.error(res.data.message || 'Withdrawal failed')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Withdrawal failed. Try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  // ─────────────────────────────────────────────
  if (fetching) return (
    <div className="wallet-page" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <style>{STYLES}</style>
      <Skeleton />
    </div>
  )

  return (
    <div className="wallet-page" style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: '100px' }}>
      <style>{STYLES}</style>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>

        {/* ── Balance Card ── */}
        <div className="wallet-card" style={{
          background:   'linear-gradient(135deg, #16a34a 0%, #14532d 100%)',
          borderRadius: '28px',
          padding:      '32px 24px 28px',
          marginBottom: '20px',
          boxShadow:    '0 12px 32px -4px rgba(22,163,74,.45)',
          position:     'relative',
          overflow:     'hidden',
          color:        '#fff'
        }}>
          {/* decorative circles */}
          <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'140px', height:'140px', borderRadius:'50%', background:'rgba(255,255,255,.07)' }} />
          <div style={{ position:'absolute', bottom:'-20px', left:'-20px', width:'100px', height:'100px', borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />

          <p style={{ fontSize:'12px', fontWeight:'700', opacity:.8, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'1.5px' }}>
            Snapit Wallet
          </p>

          <h1 className="pulse-balance" style={{ fontSize:'50px', fontWeight:'900', margin:'0 0 6px', letterSpacing:'-2px', display:'inline-block' }}>
            ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h1>

          {/* Monthly spend badge */}
          <div style={{ display:'flex', gap:'10px', marginTop:'12px', flexWrap:'wrap' }}>
            <div style={{ background:'rgba(255,255,255,.15)', backdropFilter:'blur(6px)', borderRadius:'50px', padding:'6px 14px', fontSize:'12px', fontWeight:'700', border:'1px solid rgba(255,255,255,.25)' }}>
              📉 This month: ₹{monthlySpend.toLocaleString('en-IN')} spent
            </div>
            {bonus > 0 && (
              <div style={{ background:'rgba(255,215,0,.25)', borderRadius:'50px', padding:'6px 14px', fontSize:'12px', fontWeight:'700', border:'1px solid rgba(255,215,0,.4)', color:'#fef08a' }}>
                ⚡ +₹{bonus} bonus ready!
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Amount Buttons ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'16px' }}>
          {[100, 200, 500, 1000].map(val => (
            <button
              key={val}
              className={`quick-btn${numAmount === val ? ' selected' : ''}`}
              onClick={() => setAmount(val)}
            >
              ₹{val}
            </button>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ background:'white', borderRadius:'24px', border:'1px solid #f1f5f9', overflow:'hidden', marginBottom:'16px', boxShadow:'0 4px 6px -1px rgba(0,0,0,.05)' }}>
          <div style={{ display:'flex', borderBottom:'1px solid #f1f5f9' }}>
            {[
              { key:'add',      label:'➕ Add Money' },
              { key:'withdraw', label:'🏦 Withdraw'  },
              { key:'history',  label:'📋 History'   },
            ].map(t => (
              <button
                key={t.key}
                className={`tab-btn${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding:'20px' }}>

            {/* ── ADD MONEY TAB ── */}
            {tab === 'add' && (
              <div>
                {/* Amount input */}
                <div style={{ position:'relative', marginBottom:'14px' }}>
                  <span style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontWeight:'800', fontSize:'22px' }}>₹</span>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{
                      width:'100%', border:'2px solid #f1f5f9', borderRadius:'16px',
                      padding:'16px 16px 16px 44px', fontSize:'22px', fontWeight:'800',
                      outline:'none', color:'#0f172a', background:'#f8fafc',
                      transition:'border-color .2s', fontFamily:'Sora, sans-serif'
                    }}
                    onFocus={e  => e.target.style.borderColor = '#16a34a'}
                    onBlur={e   => e.target.style.borderColor = '#f1f5f9'}
                  />
                </div>

                {/* Bonus preview */}
                {bonus > 0 && (
                  <div style={{ background:'#f0fdf4', border:'1px dashed #22c55e', borderRadius:'14px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                    <span style={{ fontSize:'20px' }}>⚡</span>
                    <div>
                      <p style={{ color:'#15803d', fontSize:'13px', fontWeight:'700', margin:0 }}>5% Bonus Applied!</p>
                      <p style={{ color:'#16a34a', fontSize:'12px', margin:'2px 0 0' }}>₹{numAmount} + ₹{bonus} bonus = <strong>₹{total} total</strong></p>
                    </div>
                  </div>
                )}

                {/* Add button */}
                <button
                  className="main-btn"
                  onClick={() => handleAddMoney()}
                  disabled={loading || !amount || numAmount <= 0}
                  style={{ marginBottom:'14px' }}
                >
                  {loading
                    ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                        <span style={{ width:'18px', height:'18px', border:'3px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
                        Processing...
                      </span>
                    : razorKey ? `💳 Pay ₹${numAmount || '—'} via Razorpay` : `➕ Add ₹${numAmount || '—'} to Wallet`
                  }
                </button>

                {/* One-tap presets */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                  {[
                    { label:'Add ₹100',       value:100  },
                    { label:'Add ₹200',       value:200  },
                    { label:'₹500 +5% Bonus', value:500  },
                  ].map(item => (
                    <button
                      key={item.value}
                      className="quick-btn"
                      onClick={() => handleAddMoney(item.value)}
                      disabled={loading}
                      style={{ fontSize:'12px', padding:'12px 4px' }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── WITHDRAW TAB ── */}
            {tab === 'withdraw' && (
              <div>
                <div style={{ background:'#eff6ff', borderRadius:'14px', padding:'12px 14px', marginBottom:'16px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  <span style={{ fontSize:'18px' }}>ℹ️</span>
                  <p style={{ color:'#1d4ed8', fontSize:'13px', fontWeight:'600', margin:0 }}>
                    Withdrawals are processed within 2–4 business days. Minimum ₹50. 
                    Money will be credited to your UPI account.
                  </p>
                </div>

                {/* Available balance */}
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'14px', padding:'14px 16px', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'13px', color:'#166534', fontWeight:'700' }}>Available to withdraw</span>
                  <span style={{ fontSize:'18px', fontWeight:'900', color:'#16a34a' }}>₹{Number(balance).toLocaleString('en-IN')}</span>
                </div>

                {/* Amount input */}
                <div style={{ position:'relative', marginBottom:'12px' }}>
                  <span style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontWeight:'800', fontSize:'22px' }}>₹</span>
                  <input
                    type="number"
                    placeholder="Amount to withdraw"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{
                      width:'100%', border:'2px solid #f1f5f9', borderRadius:'16px',
                      padding:'16px 16px 16px 44px', fontSize:'22px', fontWeight:'800',
                      outline:'none', color:'#0f172a', background:'#f8fafc',
                      transition:'border-color .2s', fontFamily:'Sora, sans-serif'
                    }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e  => e.target.style.borderColor = '#f1f5f9'}
                  />
                </div>

                {/* UPI input */}
                <div style={{ position:'relative', marginBottom:'16px' }}>
                  <input
                    type="text"
                    placeholder="Your UPI ID (e.g. name@upi)"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    style={{
                      width:'100%', border:'2px solid #f1f5f9', borderRadius:'16px',
                      padding:'14px 16px', fontSize:'15px', fontWeight:'600',
                      outline:'none', color:'#0f172a', background:'#f8fafc',
                      transition:'border-color .2s', fontFamily:'Sora, sans-serif'
                    }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e  => e.target.style.borderColor = '#f1f5f9'}
                  />
                </div>

                {numAmount > balance && (
                  <p style={{ color:'#ef4444', fontSize:'13px', fontWeight:'700', marginBottom:'12px' }}>
                    ⚠️ Amount exceeds wallet balance
                  </p>
                )}

                <button
                  className="withdraw-btn"
                  onClick={handleWithdraw}
                  disabled={withdrawing || !upiId || numAmount <= 0 || numAmount > balance}
                >
                  {withdrawing
                    ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                        <span style={{ width:'16px', height:'16px', border:'2px solid rgba(59,130,246,.3)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
                        Processing Withdrawal...
                      </span>
                    : `🏦 Withdraw ₹${numAmount || '—'} to UPI`
                  }
                </button>
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {tab === 'history' && (
              <div>
                {transactions.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 0' }}>
                    <div style={{ fontSize:'48px', marginBottom:'12px', opacity:.4 }}>🏜️</div>
                    <p style={{ color:'#94a3b8', fontSize:'15px', fontWeight:'700' }}>No transactions yet</p>
                    <p style={{ color:'#cbd5e1', fontSize:'13px', fontWeight:'600' }}>Add money to get started</p>
                  </div>
                ) : (
                  <>
                    {/* Summary bar */}
                    <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
                      <div style={{ flex:1, background:'#f0fdf4', borderRadius:'14px', padding:'12px', textAlign:'center' }}>
                        <p style={{ fontSize:'11px', color:'#166534', fontWeight:'700', margin:'0 0 4px' }}>TOTAL ADDED</p>
                        <p style={{ fontSize:'16px', fontWeight:'900', color:'#16a34a', margin:0 }}>
                          ₹{transactions.filter(t=>t.type==='credit').reduce((s,t)=>s+t.amount,0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div style={{ flex:1, background:'#fef2f2', borderRadius:'14px', padding:'12px', textAlign:'center' }}>
                        <p style={{ fontSize:'11px', color:'#991b1b', fontWeight:'700', margin:'0 0 4px' }}>TOTAL SPENT</p>
                        <p style={{ fontSize:'16px', fontWeight:'900', color:'#ef4444', margin:0 }}>
                          ₹{transactions.filter(t=>t.type==='debit').reduce((s,t)=>s+t.amount,0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {transactions.map((txn, i) => (
                      <div key={i} className="txn-row">
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <div style={{
                            width:'42px', height:'42px', borderRadius:'14px',
                            background: txn.type === 'credit' ? '#dcfce7' : '#fee2e2',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:'18px', flexShrink:0
                          }}>
                            {txn.type === 'credit' ? '💰' : '🛒'}
                          </div>
                          <div>
                            <p style={{ fontSize:'13px', fontWeight:'700', color:'#1e293b', margin:'0 0 2px' }}>
                              {txn.description}
                            </p>
                            <p style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'600', margin:0 }}>
                              {new Date(txn.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                              {' • '}
                              {new Date(txn.date).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                            </p>
                          </div>
                        </div>
                        <span style={{ fontWeight:'800', fontSize:'15px', color: txn.type==='credit' ? '#16a34a' : '#ef4444', flexShrink:0, marginLeft:'8px' }}>
                          {txn.type === 'credit' ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── Security note ── */}
        <p style={{ textAlign:'center', fontSize:'12px', color:'#94a3b8', fontWeight:'600' }}>
          🔒 Secured by Razorpay · 256-bit encryption
        </p>

      </div>
    </div>
  )
}

export default Wallet