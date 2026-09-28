import { useState, useEffect, useRef } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import { useGlobalContext } from '../provider/GlobalProvider'
import {
  FiZap,
  FiAward,
  FiGift,
  FiCalendar,
  FiShoppingBag,
  FiCheckCircle,
  FiTag,
  FiCheck,
  FiLock
} from 'react-icons/fi'
import { FaCoins, FaFire, FaWallet } from 'react-icons/fa'
import SummaryApi from '../common/SummaryApi'

// ─────────────────────────────────────────────────────────────
//  SNAPIT REWARDS PAGE
//  Sections:
//    1. Coin Wallet Card  (balance + earn rate hint)
//    2. Daily Check-in    (claim 5 coins/day, 7-day grid)
//    3. Streak Tracker    (milestone rewards from StreakTracker)
//    4. Promo Code        (apply discount, max 5% off cart)
// ─────────────────────────────────────────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');
@keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes pop     { 0%{transform:scale(1)} 40%{transform:scale(1.18)} 100%{transform:scale(1)} }
@keyframes coinSpin{ 0%{transform:rotateY(0deg)} 100%{transform:rotateY(360deg)} }
@keyframes spin    { to{transform:rotate(360deg)} }
@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
@keyframes glow    { 0%,100%{box-shadow:0 0 0px 0px rgba(239,159,39,0)} 50%{box-shadow:0 0 18px 4px rgba(239,159,39,.35)} }

.rw-page * { font-family:'Sora',sans-serif; box-sizing:border-box; }
.rw-card   { animation:fadeUp .45s ease both; background:#fff; border-radius:24px; border:1px solid #f1f5f9; overflow:hidden; margin-bottom:14px; }
.rw-card + .rw-card { animation-delay:.07s }
.rw-card:nth-child(3){ animation-delay:.14s }
.rw-card:nth-child(4){ animation-delay:.21s }

.section-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 18px 12px; border-bottom:1px solid #f8fafc;
}
.section-title { font-size:13px; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:7px; }
.section-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }

.coin-icon { animation:coinSpin 3s linear infinite; display:inline-block; }

.day-dot {
  width:40px; height:40px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:800; transition:all .2s;
  border:2px solid transparent;
}
.day-dot.done   { background:#EF9F27; color:#fff; border-color:#EF9F27; box-shadow:0 3px 10px rgba(239,159,39,.35); }
.day-dot.today  { background:#fff; color:#EF9F27; border-color:#EF9F27; animation:glow 2s ease-in-out infinite; }
.day-dot.future { background:#f8fafc; color:#cbd5e1; border-color:#f1f5f9; }

.check-btn {
  padding:12px 20px; border:none; border-radius:16px; font-family:'Sora',sans-serif;
  font-size:13px; font-weight:800; cursor:pointer; transition:all .2s;
  background:linear-gradient(135deg,#EF9F27,#BA7517);
  color:#fff; box-shadow:0 4px 14px rgba(239,159,39,.35);
}
.check-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 18px rgba(239,159,39,.45); }
.check-btn:disabled { background:#e2e8f0; box-shadow:none; color:#94a3b8; cursor:not-allowed; }

.milestone-row {
  display:flex; align-items:center; gap:12px; padding:10px 18px;
  border-bottom:1px solid #f8fafc; transition:background .15s;
}
.milestone-row:last-child { border-bottom:none; }
.milestone-row:hover { background:#fafafa; }

.claim-btn {
  padding:7px 16px; border:none; border-radius:12px; font-family:'Sora',sans-serif;
  font-size:12px; font-weight:800; cursor:pointer; transition:all .2s;
  background:#EF9F27; color:#412402;
}
.claim-btn:hover:not(:disabled) { background:#BA7517; transform:scale(1.04); }
.claim-btn:disabled { opacity:.5; cursor:not-allowed; }

.promo-wrap {
  display:flex; gap:8px; padding:0 18px 16px;
}
.promo-input {
  flex:1; padding:12px 16px; border:1.5px solid #e5e7eb; border-radius:14px;
  font-family:'Sora',sans-serif; font-size:14px; font-weight:700; color:#1e293b;
  background:#f8fafc; outline:none; transition:border-color .2s; text-transform:uppercase;
}
.promo-input:focus { border-color:#EF9F27; background:#fff; }
.promo-input::placeholder { text-transform:none; color:#cbd5e1; font-weight:600; }
.promo-apply {
  padding:12px 20px; border:none; border-radius:14px; font-family:'Sora',sans-serif;
  font-size:13px; font-weight:800; cursor:pointer; transition:all .2s;
  background:#1e293b; color:#fff;
}
.promo-apply:hover:not(:disabled) { background:#0f172a; transform:scale(1.02); }
.promo-apply:disabled { opacity:.4; cursor:not-allowed; }

.shimmer-line {
  background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
  background-size:400px 100%; animation:shimmer 1.4s infinite linear; border-radius:10px;
}
`

const MILESTONES = [
  { days:3,  coins:20,  icon:FiGift,  label:'Sprout'   },
  { days:7,  coins:50,  icon:FaFire,  label:'On Fire'  },
  { days:14, coins:120, icon:FiZap,   label:'Electric' },
  { days:30, coins:300, icon:FiAward, label:'Legend'   },
]
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ── Valid promo codes (keep in sync with backend) ────────────
// Real validation happens server-side; this just gives instant UI feedback
const PROMO_CODES = {
  'SNAPIT5':  { pct:5,  label:'5% off your order' },
  'WELCOME10':{ pct:10, label:'10% off — welcome gift!' },
  'SAVE5':    { pct:5,  label:'5% off your order' },
}

export default function RewardsPage() {
  // ── Coin wallet ──────────────────────────────────────────────
  const [coins,        setCoins]        = useState(0)
  // ── Check-in ────────────────────────────────────────────────
  const [checkedIn,    setCheckedIn]    = useState(false)
  const [checkDays,    setCheckDays]    = useState([])   // array of 7 booleans (Mon–Sun)
  const [checkLoading, setCheckLoading] = useState(false)
  // ── Streak ──────────────────────────────────────────────────
  const [streak,         setStreak]         = useState(0)
  const [claimedRewards, setClaimedRewards] = useState([])
  const [streakAlive,    setStreakAlive]     = useState(false)
  const [orderedToday,   setOrderedToday]   = useState(false)
  const [claimingMs,     setClaimingMs]     = useState(null)
  const [convertingCoins, setConvertingCoins] = useState(false)
  // ── Promo ────────────────────────────────────────────────────
  const [promoInput,   setPromoInput]   = useState('')
  const [promoResult,  setPromoResult]  = useState(null)   // { success, message, pct }
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoApplied, setPromoApplied] = useState(false)
  // ── Global ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const { fetchUser } = useGlobalContext() || {}
  const coinRef = useRef()

  // ── Fetch all data in one shot ───────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const streakRes = await Axios({ url:'/api/streak/me', method:'get' })
        if (streakRes.data.success) {
          const d = streakRes.data.data
          setCoins(d.coins || 0)
          setCheckedIn(Boolean(d.checkedInToday))
          setStreak(d.currentStreak || 0)
          setClaimedRewards(d.claimedMilestones || [])
          setStreakAlive(Boolean(d.streakAlive))
          setOrderedToday(Boolean(d.orderedToday))
        }
      } catch (err) {
        console.error('Rewards fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // ── Daily check-in ───────────────────────────────────────────
  const handleCheckIn = async () => {
    if (checkedIn || checkLoading) return
    setCheckLoading(true)
    try {
      const res = await Axios({ url:'/api/streak/checkin', method:'post' })
      if (res.data.success) {
        const earned = res.data.data?.coinsEarned || 10
        setCheckedIn(true)
        setCoins(res.data.data?.coins || (prev => prev + earned))
        toast.success(`+${earned} coins earned! Keep coming back 🪙`)
        if (coinRef.current) coinRef.current.style.animation = 'pop .4s ease'
        setTimeout(() => { if (coinRef.current) coinRef.current.style.animation = '' }, 500)
        if (fetchUser) fetchUser()
      } else {
        toast.error(res.data.message || 'Already checked in today')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Check-in failed. Try again.')
    } finally {
      setCheckLoading(false)
    }
  }

  // ── Claim milestone ──────────────────────────────────────────
  const handleClaim = async (days) => {
    setClaimingMs(days)
    try {
      const res = await Axios({ url:'/api/streak/claim', method:'post', data:{ milestone:days } })
      if (res.data.success) {
        setClaimedRewards(prev => [...prev, days])
        const earned = MILESTONES.find(m => m.days === days)?.coins || 0
        setCoins(prev => prev + earned)
        toast.success(`🎉 +${earned} Snapit Coins collected!`)
        if (fetchUser) fetchUser()
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Claim failed')
    } finally {
      setClaimingMs(null)
    }
  }

  // ── Convert coins to real money in wallet (10 coins = ₹0.10) ────
  const handleConvertCoins = async () => {
    if (coins < 10 || convertingCoins) return
    const coinsToConvert = Math.floor(coins / 10) * 10
    const rupees = ((coinsToConvert / 10) * 0.10).toFixed(2)
    setConvertingCoins(true)
    try {
      const res = await Axios({
        url: SummaryApi.convertCoinsToWallet?.url || '/api/streak/convert-to-wallet',
        method: SummaryApi.convertCoinsToWallet?.method || 'post',
        data: { coins: coinsToConvert }
      })
      if (res.data?.success) {
        toast.success(res.data?.message || `🎉 ₹${rupees} credited to your wallet!`)
        setCoins(res.data.data?.coins ?? (coins - coinsToConvert))
        if (fetchUser) fetchUser()
      } else {
        toast.error(res.data?.message || 'Coin conversion failed')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to convert coins')
    } finally {
      setConvertingCoins(false)
    }
  }

  // ── Apply promo code ─────────────────────────────────────────
  const handlePromo = async () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return toast.error('Enter a promo code first')
    setPromoLoading(true)
    setPromoResult(null)
    try {
      const res = await Axios({ url:'/api/promo/validate', method:'post', data:{ code } })
      if (res.data.success) {
        setPromoResult({ success:true, message:res.data.message, pct:res.data.data?.discount })
        setPromoApplied(true)
        toast.success(res.data.message || 'Promo code applied!')
      } else {
        setPromoResult({ success:false, message:res.data.message || 'Invalid code' })
      }
    } catch (err) {
      // Fallback: client-side check so UI doesn't break if API isn't wired yet
      const known = PROMO_CODES[code]
      if (known) {
        setPromoResult({ success:true, message:known.label, pct:known.pct })
        setPromoApplied(true)
        toast.success(`Code applied — ${known.label}`)
      } else {
        setPromoResult({ success:false, message: err?.response?.data?.message || 'Code not found' })
      }
    } finally {
      setPromoLoading(false)
    }
  }

  // ── Derived ──────────────────────────────────────────────────
  const nextMilestone = MILESTONES.find(m => m.days > streak)
  const claimable     = MILESTONES.filter(m => m.days <= streak && !claimedRewards.includes(m.days))
  const progressPct   = nextMilestone
    ? Math.min(100, Math.round((streak / nextMilestone.days) * 100))
    : 100
  const todayIdx      = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()

  // ── Skeleton ─────────────────────────────────────────────────
  if (loading) return (
    <div className="rw-page" style={{ padding:'16px', maxWidth:'480px', margin:'0 auto' }}>
      <style>{STYLES}</style>
      {[180,100,220,120].map((h,i) => (
        <div key={i} className="shimmer-line" style={{ height:`${h}px`, marginBottom:'14px' }} />
      ))}
    </div>
  )

  return (
    <div className="rw-page" style={{ maxWidth:'480px', margin:'0 auto', padding:'16px 16px 100px' }}>
      <style>{STYLES}</style>

      {/* ── 1. COIN WALLET CARD ─────────────────────────────── */}
      <div className="rw-card">
        <div style={{
          background:'linear-gradient(135deg,#BA7517 0%,#412402 100%)',
          padding:'24px 20px', position:'relative', overflow:'hidden'
        }}>
          {/* decorative circles */}
          <div style={{ position:'absolute',top:'-24px',right:'-24px',width:'110px',height:'110px',borderRadius:'50%',background:'rgba(255,255,255,.07)' }} />
          <div style={{ position:'absolute',bottom:'-16px',left:'-16px',width:'80px',height:'80px',borderRadius:'50%',background:'rgba(255,255,255,.05)' }} />

          <p style={{ color:'rgba(255,255,255,.75)', fontSize:'11px', fontWeight:'800', textTransform:'uppercase', letterSpacing:'1.8px', margin:'0 0 4px' }}>
            Snapit Coins
          </p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:'8px' }}>
            <span ref={coinRef} style={{ fontSize:'44px', fontWeight:'900', color:'#fff', lineHeight:1 }}>
              {coins.toLocaleString('en-IN')}
            </span>
            <span style={{ color:'rgba(255,255,255,.7)', fontSize:'14px', fontWeight:'700', marginBottom:'4px' }}>coins</span>
          </div>
          <p style={{ color:'rgba(255,255,255,.9)', fontSize:'12px', fontWeight:'700', margin:'8px 0 0' }}>
            10 Snapit Coins = ₹0.10 Wallet Cash • Redeemable or Convertible to Wallet
          </p>

          <div style={{ marginTop:'14px', display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center' }}>
            {coins >= 10 ? (
              <button
                type='button'
                onClick={handleConvertCoins}
                disabled={convertingCoins}
                style={{
                  padding:'8px 16px',
                  borderRadius:'14px',
                  border:'none',
                  background:'#fff',
                  color:'#BA7517',
                  fontSize:'12px',
                  fontWeight:'800',
                  cursor:'pointer',
                  display:'inline-flex',
                  alignItems:'center',
                  gap:'6px',
                  boxShadow:'0 3px 10px rgba(0,0,0,.18)',
                  transition:'all .2s'
                }}
              >
                <FaWallet size={12} />
                <span>
                  {convertingCoins
                    ? 'Transferring…'
                    : `Add ₹${((Math.floor(coins / 10) * 10) * 0.01).toFixed(2)} to Wallet (${Math.floor(coins / 10) * 10} Coins)`}
                </span>
              </button>
            ) : (
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,.8)', fontWeight:'600', display:'inline-flex', alignItems:'center', gap:'5px' }}>
                <FaWallet size={11} />
                <span>Need 10+ coins to convert to wallet cash</span>
              </div>
            )}

            <div style={{ background:'rgba(255,255,255,.15)', borderRadius:'50px', padding:'6px 12px', fontSize:'11px', fontWeight:'700', color:'#fef3c7', border:'1px solid rgba(255,255,255,.2)', display:'inline-flex', alignItems:'center', gap:'5px' }}>
              <FiCalendar size={12} className='text-amber-200' />
              <span>+10 coins/day</span>
            </div>
          </div>
        </div>

        {/* How coins work */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderTop:'1px solid #f8fafc' }}>
          {[
            { icon: FiCalendar,    label:'Check-in',  val:'+10/day'  },
            { icon: FiShoppingBag, label:'Per order', val:'+10–50'  },
            { icon: FiAward,       label:'Milestone', val:'+20–300' },
          ].map(item => {
            const IconComp = item.icon
            return (
              <div key={item.label} style={{ padding:'12px 8px', textAlign:'center', borderRight:'1px solid #f8fafc' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:'4px', color:'#EF9F27' }}>
                  <IconComp size={17} />
                </div>
                <div style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'700' }}>{item.label}</div>
                <div style={{ fontSize:'12px', color:'#EF9F27', fontWeight:'800' }}>{item.val}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 2. DAILY CHECK-IN ───────────────────────────────── */}
      <div className="rw-card">
        <div className="section-head">
          <div className="section-title">
            <FiCalendar size={16} className='text-amber-500' />
            <span>Daily Check-in</span>
            {checkedIn && <span className="section-badge" style={{ background:'#dcfce7', color:'#166534', display:'inline-flex', alignItems:'center', gap:'4px' }}><FiCheckCircle size={11} /> Done today</span>}
          </div>
          <span style={{ fontSize:'12px', fontWeight:'700', color:'#EF9F27' }}>+10 coins/day</span>
        </div>

        {/* 7-day grid */}
        <div style={{ padding:'14px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px' }}>
            {DAYS_SHORT.map((day, i) => {
              const isToday   = i === todayIdx
              const isDone    = isToday ? checkedIn : (i < todayIdx && streak >= (todayIdx - i))
              const dotClass  = isDone ? 'day-dot done' : isToday ? 'day-dot today' : 'day-dot future'
              return (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'5px' }}>
                  <div className={dotClass}>
                    {isDone ? '✓' : isToday ? '◎' : ''}
                  </div>
                  <span style={{ fontSize:'9px', fontWeight:'800', color: isDone ? '#EF9F27' : isToday ? '#EF9F27' : '#cbd5e1' }}>
                    {day}
                  </span>
                </div>
              )
            })}
          </div>

          <button
            className="check-btn"
            onClick={handleCheckIn}
            disabled={checkedIn || checkLoading}
            style={{ width:'100%' }}
          >
            {checkLoading
              ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  <span style={{ width:'14px',height:'14px',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block' }} />
                  Claiming...
                </span>
              : checkedIn
                ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}><FiCheckCircle size={15} /> Checked in — come back tomorrow!</span>
                : <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}><FaCoins size={14} /> Claim 10 Coins — Daily Check-in</span>
            }
          </button>
        </div>
      </div>

      {/* ── 3. STREAK TRACKER ───────────────────────────────── */}
      <div className="rw-card">
        <div className="section-head">
          <div className="section-title">
            <FaFire size={15} style={{ color: streakAlive ? '#f97316' : '#94a3b8' }} />
            <span>Streak — {streak} day{streak !== 1 ? 's' : ''}</span>
          </div>
          {streakAlive && !orderedToday && (
            <span className="section-badge" style={{ background:'#fef9c3', color:'#854d0e' }}>Order today!</span>
          )}
        </div>

        {/* Progress bar */}
        {nextMilestone && (() => {
          const NextIcon = nextMilestone.icon
          return (
            <div style={{ padding:'10px 18px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', fontWeight:'700', color:'#94a3b8', marginBottom:'6px' }}>
                <span>{streak} days</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:'4px' }}>
                  <NextIcon size={12} className='text-amber-500' />
                  <span>{nextMilestone.days}d → +{nextMilestone.coins} coins</span>
                </span>
              </div>
              <div style={{ height:'8px', background:'#f1f5f9', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progressPct}%`, background:'linear-gradient(90deg,#EF9F27,#BA7517)', borderRadius:'99px', transition:'width .7s ease' }} />
              </div>
              <p style={{ fontSize:'10px', color:'#94a3b8', fontWeight:'600', marginTop:'5px', textAlign:'right' }}>
                {nextMilestone.days - streak} more day{nextMilestone.days - streak !== 1 ? 's' : ''} to next reward
              </p>
            </div>
          )
        })()}

        {/* Claimable banner */}
        {claimable.length > 0 && (
          <div style={{ margin:'0 14px 10px', background:'#fefce8', border:'1px solid #fde68a', borderRadius:'14px', padding:'10px 14px' }}>
            <p style={{ fontSize:'11px', fontWeight:'800', color:'#92400e', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'.05em', display:'flex', alignItems:'center', gap:'6px' }}>
              <FiGift size={14} />
              <span>Ready to claim!</span>
            </p>
            {claimable.map(m => {
              const ClaimIcon = m.icon
              return (
                <div key={m.days} style={{ display:'flex', alignItems:'center', gap:'10px', paddingBottom:'6px' }}>
                  <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'#fef3c7', color:'#b45309', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ClaimIcon size={15} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:'13px', fontWeight:'800', color:'#1e293b', margin:0 }}>{m.coins} Coins — {m.label}</p>
                    <p style={{ fontSize:'10px', color:'#64748b', margin:'1px 0 0' }}>{m.days}-day milestone</p>
                  </div>
                  <button className="claim-btn" onClick={() => handleClaim(m.days)} disabled={claimingMs === m.days}>
                    {claimingMs === m.days ? '...' : 'CLAIM'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* All milestones */}
        {MILESTONES.map(m => {
          const achieved = streak >= m.days
          const claimed  = claimedRewards.includes(m.days)
          const MIcon    = m.icon
          return (
            <div className="milestone-row" key={m.days}>
              <div style={{ width:'32px', height:'32px', borderRadius:'10px', background: achieved ? '#fef3c7' : '#f1f5f9', color: achieved ? '#b45309' : '#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <MIcon size={16} />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:'13px', fontWeight:'800', color: achieved ? '#1e293b' : '#94a3b8', margin:0 }}>
                  {m.days} Days · {m.label}
                </p>
                <p style={{ fontSize:'11px', fontWeight:'700', color: achieved ? '#EF9F27' : '#cbd5e1', margin:'2px 0 0' }}>
                  +{m.coins} Snapit Coins
                </p>
              </div>
              <span style={{
                fontSize:'11px', fontWeight:'800', padding:'4px 10px', borderRadius:'10px',
                background: claimed ? '#dcfce7' : achieved ? '#fef9c3' : '#f8fafc',
                color:      claimed ? '#166534' : achieved ? '#92400e' : '#cbd5e1',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}>
                {claimed ? <><FiCheckCircle size={12} /> Done</> : achieved ? <><FiGift size={12} /> Claim</> : <><FiLock size={11} /> {m.days - streak}d</>}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── 4. PROMO CODE ───────────────────────────────────── */}
      <div className="rw-card">
        <div className="section-head">
          <div className="section-title">
            <FiTag size={15} className='text-slate-600' />
            <span>Promo Code</span>
          </div>
          <span style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'600' }}>up to 50% off</span>
        </div>
          <span style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'600' }}>up to 50% off</span>
        </div>

        <div style={{ padding:'10px 18px 4px' }}>
          <p style={{ fontSize:'12px', color:'#64748b', fontWeight:'600', margin:'0 0 10px' }}>
            Enter a code to get discount on your next order
          </p>
        </div>

        <div className="promo-wrap">
          <input
            className="promo-input"
            placeholder="e.g. SNAPIT5, WELCOME10"
            value={promoInput}
            onChange={e => { setPromoInput(e.target.value); setPromoResult(null); setPromoApplied(false) }}
            onKeyDown={e => e.key === 'Enter' && handlePromo()}
            disabled={promoApplied}
          />
          <button
            className="promo-apply"
            onClick={handlePromo}
            disabled={promoLoading || promoApplied || !promoInput.trim()}
          >
            {promoLoading
              ? <span style={{ width:'14px',height:'14px',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block' }} />
              : promoApplied ? '✓' : 'Apply'
            }
          </button>
        </div>

        {/* Result message */}
        {promoResult && (
          <div style={{
            margin:'0 18px 14px',
            padding:'10px 14px',
            borderRadius:'14px',
            background: promoResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${promoResult.success ? '#bbf7d0' : '#fecaca'}`,
            display:'flex', alignItems:'center', gap:'8px'
          }}>
            <span style={{ fontSize:'16px' }}>{promoResult.success ? '✅' : '❌'}</span>
            <div>
              <p style={{ fontSize:'13px', fontWeight:'800', color: promoResult.success ? '#166534' : '#991b1b', margin:0 }}>
                {promoResult.message}
              </p>
              {promoResult.success && promoResult.pct && (
                <p style={{ fontSize:'11px', color:'#16a34a', fontWeight:'600', margin:'2px 0 0' }}>
                  {promoResult.pct}% discount applied at checkout
                </p>
              )}
            </div>
            {promoResult.success && (
              <button
                onClick={() => { setPromoInput(''); setPromoResult(null); setPromoApplied(false) }}
                style={{ marginLeft:'auto', background:'none', border:'none', fontSize:'16px', cursor:'pointer', color:'#94a3b8' }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Hint codes */}
        {!promoApplied && (
          <div style={{ padding:'0 18px 16px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {['SNAPIT5','WELCOME10'].map(code => (
              <button key={code} onClick={() => setPromoInput(code)} style={{
                padding:'5px 12px', borderRadius:'20px', border:'1px dashed #e5e7eb',
                background:'#f8fafc', fontSize:'11px', fontWeight:'700', color:'#64748b',
                cursor:'pointer', fontFamily:'Sora,sans-serif', transition:'all .15s'
              }}
                onMouseEnter={e => { e.target.style.borderColor='#EF9F27'; e.target.style.color='#EF9F27' }}
                onMouseLeave={e => { e.target.style.borderColor='#e5e7eb'; e.target.style.color='#64748b'  }}
              >
                {code}
              </button>
            ))}
            <span style={{ fontSize:'11px', color:'#cbd5e1', fontWeight:'600', alignSelf:'center' }}>← try these</span>
          </div>
        )}
      </div>

      {/* ── Footer note ─────────────────────────────────────── */}
      <p style={{ textAlign:'center', fontSize:'11px', color:'#94a3b8', fontWeight:'600', marginTop:'8px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
        <FaCoins size={12} className='text-amber-500' />
        <span>Coins credited instantly · Promo codes are single-use</span>
      </p>
    </div>
  )
}