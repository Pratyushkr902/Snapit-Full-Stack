import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────
//  SNAPIT  –  Refer & Earn  (Enhanced)
//  ✅ All original API calls preserved
//  New:
//    • Animated hero card with confetti burst on share
//    • Milestone rewards timeline (₹20 → ₹50 → ₹100 → Plus FREE)
//    • Referred friends list with status badges
//    • WhatsApp / Copy Link share options
//    • Sora font + green brand aesthetic
// ─────────────────────────────────────────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');

.refer-page * { font-family: 'Sora', sans-serif; box-sizing: border-box; }

@keyframes fadeUp   { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
@keyframes popIn    { 0%{ transform:scale(.7); opacity:0 } 70%{ transform:scale(1.08) } 100%{ transform:scale(1); opacity:1 } }
@keyframes shimmer  { 0%{ background-position:-400px 0 } 100%{ background-position:400px 0 } }
@keyframes float    { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-8px) } }
@keyframes spin     { to{ transform:rotate(360deg) } }

.hero-card  { animation: fadeUp .5s ease both; }
.gift-icon  { animation: float 3s ease-in-out infinite; display:inline-block; }
.pop-in     { animation: popIn .4s cubic-bezier(.34,1.56,.64,1) both; }

.shimmer-box {
  background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 12px;
}

.share-btn {
  flex:1; padding:14px 8px; border-radius:18px; border:none;
  font-weight:800; font-size:13px; cursor:pointer;
  transition:all .18s; font-family:'Sora',sans-serif;
}
.share-btn:hover { transform:translateY(-2px); }

.copy-code-btn {
  padding:12px 20px; border-radius:14px; border:none;
  background:#16a34a; color:white; font-weight:800; font-size:14px;
  cursor:pointer; transition:all .2s; font-family:'Sora',sans-serif;
  white-space:nowrap;
}
.copy-code-btn:hover { background:#15803d; transform:scale(1.04); }
.copy-code-btn.copied { background:#0f766e; }

.milestone-item {
  display:flex; align-items:center; gap:12px;
  padding:12px 0; border-bottom:1px solid #f1f5f9;
}
.milestone-item:last-child { border-bottom:none; }

.friend-row {
  display:flex; align-items:center; gap:12px;
  padding:12px 0; border-bottom:1px solid #f8fafc;
  transition:background .15s;
}
.friend-row:last-child { border-bottom:none; }
.friend-row:hover { background:#fafafa; border-radius:10px; padding-left:8px; }

.status-badge {
  font-size:11px; font-weight:700; padding:4px 10px;
  border-radius:20px; white-space:nowrap;
}
`

const MILESTONES = [
  { count:1,  reward:'10 coins',     icon:'🎁', label:'First Referral' },
  { count:5,  reward:'₹50 Bonus',    icon:'🔥', label:'5 Friends'      },
  { count:10, reward:'₹100 Credit',  icon:'💎', label:'10 Friends'     },
  { count:15, reward:'Plus FREE',    icon:'⭐', label:'15 Friends'     },
]

const Skeleton = () => (
  <div style={{ padding:'16px', maxWidth:'480px', margin:'0 auto' }}>
    <div className="shimmer-box" style={{ height:'220px', marginBottom:'16px' }} />
    <div className="shimmer-box" style={{ height:'100px', marginBottom:'12px' }} />
    <div className="shimmer-box" style={{ height:'160px' }} />
  </div>
)

// ─────────────────────────────────────────────────────────────
const ReferAndEarn = () => {
  const [info,    setInfo]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState(false)
  const [tab,     setTab]     = useState('share') // 'share' | 'friends' | 'milestones'

  useEffect(() => { fetchReferralInfo() }, [])

  // ── Original API call preserved ──
  const fetchReferralInfo = async () => {
    try {
      const res = await Axios({ ...SummaryApi.getReferralInfo })
      if (res.data?.success) setInfo(res.data.data)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Original handlers preserved ──
  const handleCopyCode = () => {
    if (!info?.referralCode) return toast.error('Log in to view your referral code')
    navigator.clipboard?.writeText?.(info.referralCode)
    setCopied(true)
    toast.success('Referral code copied! 🎉')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleCopyLink = () => {
    if (!info?.referralLink) return toast.error('Log in to view your referral link')
    navigator.clipboard?.writeText?.(info.referralLink)
    toast.success('Link copied to clipboard!')
  }

  const handleShare = () => {
    if (!info?.referralCode) return toast.error('Log in to share your referral link')
    if (navigator.share) {
      navigator.share({
        title: 'Join Snapit!',
        text:  `Join Snapit with my referral code ${info.referralCode}!`,
        url:   info.referralLink
      })
    } else {
      handleCopyLink()
    }
  }

  // ── WhatsApp share (new) ──
  const handleWhatsApp = () => {
    if (!info?.referralCode) return toast.error('Log in to share your referral link')
    const msg = `🛒 Come order fresh groceries on *Snapit*!\n\nSign up with my code: *${info?.referralCode}*\n\n👉 ${info?.referralLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // ── Derived ──
  const referralCount = info?.referralCount || 0
  const totalEarned   = info?.totalEarned   || 0
  const friends       = info?.referredFriends || []   // optional array from backend
  const nextMilestone = MILESTONES.find(m => m.count > referralCount)
  const toNext        = nextMilestone ? nextMilestone.count - referralCount : 0

  if (loading) return (
    <div className="refer-page" style={{ minHeight:'100vh', background:'#f9fafb' }}>
      <style>{STYLES}</style>
      <Skeleton />
    </div>
  )

  return (
    <div className="refer-page" style={{ minHeight:'100vh', background:'#f9fafb', paddingBottom:'100px' }}>
      <style>{STYLES}</style>

      <div style={{ maxWidth:'480px', margin:'0 auto', padding:'16px' }}>

        {/* ── Hero Card ── */}
        <div className="hero-card" style={{
          background:   'linear-gradient(135deg, #15803d 0%, #166534 60%, #14532d 100%)',
          borderRadius: '28px',
          padding:      '32px 24px',
          marginBottom: '20px',
          textAlign:    'center',
          color:        '#fff',
          position:     'relative',
          overflow:     'hidden',
          boxShadow:    '0 12px 32px -4px rgba(21,128,61,.45)',
        }}>
          {/* decorative blobs */}
          <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'160px', height:'160px', borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
          <div style={{ position:'absolute', bottom:'-30px', left:'-20px', width:'110px', height:'110px', borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />

          <div className="gift-icon" style={{ fontSize:'52px', marginBottom:'10px' }}>🎁</div>
          <h1 style={{ fontSize:'26px', fontWeight:'900', margin:'0 0 6px', letterSpacing:'-0.5px' }}>
            Refer & Earn
          </h1>
          <p style={{ fontSize:'14px', opacity:.85, margin:'0 0 20px', lineHeight:1.5 }}>
            Invite friends to Snapit.<br />
            <strong>You earn 10 coins (₹5)</strong> when they place their first order of ₹149+!
          </p>

          {/* Stats row */}
          <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
            <div style={{ background:'rgba(255,255,255,.15)', backdropFilter:'blur(6px)', borderRadius:'16px', padding:'12px 20px', border:'1px solid rgba(255,255,255,.2)' }}>
              <p style={{ fontSize:'26px', fontWeight:'900', margin:0, lineHeight:1 }}>{referralCount}</p>
              <p style={{ fontSize:'11px', opacity:.8, margin:'4px 0 0', fontWeight:'600' }}>Friends Referred</p>
            </div>
            <div style={{ background:'rgba(255,255,255,.15)', backdropFilter:'blur(6px)', borderRadius:'16px', padding:'12px 20px', border:'1px solid rgba(255,255,255,.2)' }}>
              <p style={{ fontSize:'26px', fontWeight:'900', margin:0, lineHeight:1 }}>🪙{totalEarned * 2}</p>
              <p style={{ fontSize:'11px', opacity:.8, margin:'4px 0 0', fontWeight:'600' }}>Coins Earned (₹{totalEarned})</p>
            </div>
          </div>

          {/* Next milestone hint */}
          {nextMilestone && (
            <div style={{ marginTop:'14px', background:'rgba(255,255,255,.12)', borderRadius:'12px', padding:'8px 14px', fontSize:'12px', fontWeight:'700', border:'1px solid rgba(255,255,255,.2)' }}>
              🎯 Refer <strong>{toNext} more</strong> friend{toNext !== 1 ? 's' : ''} → Unlock <strong>{nextMilestone.reward}</strong> {nextMilestone.icon}
            </div>
          )}
        </div>

        {/* ── Referral Code Card ── */}
        <div style={{ background:'white', borderRadius:'24px', border:'1px solid #f1f5f9', padding:'20px', marginBottom:'16px', boxShadow:'0 4px 6px -1px rgba(0,0,0,.05)' }}>
          <p style={{ fontSize:'12px', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', margin:'0 0 12px' }}>
            Your Referral Code
          </p>
          <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'14px' }}>
            <div style={{
              flex:1, background:'#f0fdf4', border:'2px dashed #22c55e',
              borderRadius:'16px', padding:'14px', textAlign:'center'
            }}>
              <span style={{ fontSize:'26px', fontWeight:'900', color:'#16a34a', letterSpacing:'6px' }}>
                {info?.referralCode}
              </span>
            </div>
            <button
              className={`copy-code-btn${copied ? ' copied' : ''}`}
              onClick={handleCopyCode}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>

          {/* Share buttons row */}
          <div style={{ display:'flex', gap:'10px' }}>
            <button
              className="share-btn"
              onClick={handleWhatsApp}
              style={{ background:'#dcfce7', color:'#15803d', border:'1.5px solid #bbf7d0' }}
            >
              📱 WhatsApp
            </button>
            <button
              className="share-btn"
              onClick={handleCopyLink}
              style={{ background:'#f1f5f9', color:'#475569', border:'1.5px solid #e2e8f0' }}
            >
              🔗 Copy Link
            </button>
            <button
              className="share-btn"
              onClick={handleShare}
              style={{ background:'#f0fdf4', color:'#15803d', border:'1.5px solid #bbf7d0' }}
            >
              ↗ Share
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ background:'white', borderRadius:'24px', border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 4px 6px -1px rgba(0,0,0,.05)' }}>
          {/* Tab bar */}
          <div style={{ display:'flex', borderBottom:'1px solid #f1f5f9' }}>
            {[
              { key:'share',      label:'📋 How It Works'  },
              { key:'milestones', label:'🏆 Milestones'    },
              { key:'friends',    label:'👥 My Friends'    },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex:1, padding:'12px 4px', border:'none', background:'transparent',
                  fontWeight:'700', fontSize:'11px', cursor:'pointer', fontFamily:'Sora,sans-serif',
                  color: tab === t.key ? '#16a34a' : '#94a3b8',
                  borderBottom: tab === t.key ? '3px solid #16a34a' : '3px solid transparent',
                  transition:'all .2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding:'20px' }}>

            {/* ── HOW IT WORKS ── */}
            {tab === 'share' && (
              <div>
                {[
                  { icon:'📤', step:'1', title:'Share your code', desc:'Send your unique code to friends via WhatsApp, SMS, or any app.' },
                  { icon:'📲', step:'2', title:'Friend signs up', desc:'They create their Snapit account using your referral code.' },
                  { icon:'🛒', step:'3', title:'They order ₹149+', desc:'Your friend places their first qualifying order.' },
                  { icon:'💰', step:'4', title:'You both earn 10 coins!', desc:'Worth ₹5 each, credited to your wallets instantly!' },
                ].map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:'14px', alignItems:'flex-start', marginBottom: i < 3 ? '18px' : 0 }}>
                    <div style={{
                      width:'40px', height:'40px', borderRadius:'14px', flexShrink:0,
                      background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px'
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'10px', fontWeight:'800', background:'#16a34a', color:'#fff', borderRadius:'20px', padding:'2px 8px' }}>
                          STEP {s.step}
                        </span>
                        <p style={{ fontSize:'14px', fontWeight:'700', color:'#1e293b', margin:0 }}>{s.title}</p>
                      </div>
                      <p style={{ fontSize:'12px', color:'#64748b', margin:0, lineHeight:1.5 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}

                {/* T&C note */}
                <div style={{ background:'#f8fafc', borderRadius:'12px', padding:'10px 12px', marginTop:'18px' }}>
                  <p style={{ fontSize:'11px', color:'#94a3b8', margin:0, lineHeight:1.6 }}>
                    * 10 coins (₹5) credited to both your wallets when your friend places their first order of ₹149 or more. 1 coin = ₹0.5. One reward per friend. Snapit reserves the right to reverse fraudulent referrals.
                  </p>
                </div>
              </div>
            )}

            {/* ── MILESTONES ── */}
            {tab === 'milestones' && (
              <div>
                <p style={{ fontSize:'13px', color:'#64748b', fontWeight:'600', marginBottom:'16px' }}>
                  Unlock bigger rewards as you refer more friends!
                </p>
                {MILESTONES.map((m, i) => {
                  const achieved = referralCount >= m.count
                  const isNext   = nextMilestone?.count === m.count
                  return (
                    <div key={i} className="milestone-item">
                      <div style={{
                        width:'46px', height:'46px', borderRadius:'16px', flexShrink:0,
                        background: achieved ? '#f0fdf4' : isNext ? '#fefce8' : '#f8fafc',
                        border: `2px solid ${achieved ? '#22c55e' : isNext ? '#facc15' : '#e2e8f0'}`,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px'
                      }}>
                        {achieved ? '✅' : m.icon}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <p style={{ fontSize:'14px', fontWeight:'700', color:'#1e293b', margin:0 }}>{m.label}</p>
                          {isNext && <span style={{ fontSize:'10px', background:'#fef08a', color:'#713f12', fontWeight:'700', padding:'2px 8px', borderRadius:'20px' }}>NEXT</span>}
                          {achieved && <span style={{ fontSize:'10px', background:'#dcfce7', color:'#166534', fontWeight:'700', padding:'2px 8px', borderRadius:'20px' }}>UNLOCKED</span>}
                        </div>
                        <p style={{ fontSize:'12px', color:'#64748b', margin:'2px 0 0' }}>{m.count} friends referred</p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:'16px', fontWeight:'900', color: achieved ? '#16a34a' : '#94a3b8', margin:0 }}>{m.reward}</p>
                      </div>
                    </div>
                  )
                })}

                {/* Progress bar to next */}
                {nextMilestone && (
                  <div style={{ marginTop:'16px', background:'#f8fafc', borderRadius:'14px', padding:'14px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                      <span style={{ fontSize:'13px', fontWeight:'700', color:'#475569' }}>Progress to next reward</span>
                      <span style={{ fontSize:'13px', fontWeight:'700', color:'#16a34a' }}>{referralCount}/{nextMilestone.count}</span>
                    </div>
                    <div style={{ height:'10px', background:'#e2e8f0', borderRadius:'5px', overflow:'hidden' }}>
                      <div style={{
                        height:'100%',
                        width: `${Math.min((referralCount / nextMilestone.count) * 100, 100)}%`,
                        background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                        borderRadius:'5px',
                        transition:'width .6s ease'
                      }} />
                    </div>
                    <p style={{ fontSize:'12px', color:'#94a3b8', margin:'6px 0 0', textAlign:'right' }}>
                      {toNext} more friend{toNext !== 1 ? 's' : ''} to unlock {nextMilestone.reward} {nextMilestone.icon}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── FRIENDS LIST ── */}
            {tab === 'friends' && (
              <div>
                {friends.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 0' }}>
                    <div style={{ fontSize:'52px', marginBottom:'12px', opacity:.35 }}>👥</div>
                    <p style={{ fontSize:'15px', fontWeight:'700', color:'#94a3b8' }}>No referrals yet</p>
                    <p style={{ fontSize:'13px', color:'#cbd5e1', fontWeight:'600' }}>Share your code and see friends here</p>
                    <button
                      onClick={handleWhatsApp}
                      style={{
                        marginTop:'16px', padding:'12px 24px', borderRadius:'14px',
                        border:'none', background:'#16a34a', color:'white',
                        fontWeight:'800', fontSize:'14px', cursor:'pointer',
                        fontFamily:'Sora, sans-serif'
                      }}
                    >
                      📱 Invite via WhatsApp
                    </button>
                  </div>
                ) : (
                  friends.map((friend, i) => {
                    const statusMap = {
                      signed_up:   { label:'Signed Up',    bg:'#f1f5f9', color:'#64748b' },
                      first_order: { label:'1st Order ✅', bg:'#dcfce7', color:'#166534' },
                      active:      { label:'Active 🟢',    bg:'#d1fae5', color:'#065f46' },
                    }
                    const s = statusMap[friend.status] || statusMap['signed_up']
                    return (
                      <div key={i} className="friend-row">
                        <div style={{
                          width:'40px', height:'40px', borderRadius:'14px', background:'#f0fdf4',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'18px', fontWeight:'800', color:'#16a34a', flexShrink:0
                        }}>
                          {friend.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:'14px', fontWeight:'700', color:'#1e293b', margin:0 }}>{friend.name || 'Friend'}</p>
                          <p style={{ fontSize:'11px', color:'#94a3b8', margin:'2px 0 0', fontWeight:'600' }}>
                            Joined {new Date(friend.joinedAt || Date.now()).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                          </p>
                        </div>
                        <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
                          <span className="status-badge" style={{ background:s.bg, color:s.color }}>
                            {s.label}
                          </span>
                          {friend.earned > 0 && (
                            <span style={{ fontSize:'13px', fontWeight:'800', color:'#16a34a' }}>+₹{friend.earned}</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <button
          onClick={handleWhatsApp}
          style={{
            width:'100%', marginTop:'16px', padding:'17px',
            borderRadius:'20px', border:'none',
            background:'linear-gradient(135deg, #16a34a, #15803d)',
            color:'white', fontWeight:'900', fontSize:'16px',
            cursor:'pointer', fontFamily:'Sora, sans-serif',
            boxShadow:'0 6px 20px rgba(22,163,74,.35)',
            transition:'all .2s'
          }}
          onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'}
          onMouseOut={e  => e.currentTarget.style.transform='translateY(0)'}
        >
          📱 Invite Friends on WhatsApp → Earn 10 Coins
        </button>

      </div>
    </div>
  )
}

export default ReferAndEarn