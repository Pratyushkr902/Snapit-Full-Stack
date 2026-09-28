import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { haptic } from '../utils/haptics'
import {
  IoArrowBack,
  IoShareSocialOutline,
  IoInformationCircleOutline,
  IoSparkles
} from 'react-icons/io5'
import { FaWhatsapp, FaCoins, FaWallet, FaCheck } from 'react-icons/fa'
import {
  FiUsers,
  FiAward,
  FiGift,
  FiCopy,
  FiTrendingUp,
  FiShield,
  FiCheckCircle,
  FiClock
} from 'react-icons/fi'

const MILESTONES = [
  { count: 1,  reward: '50 Coins (₹1)',     icon: FiGift,       label: 'Starter Tier', desc: '1st friend places first order' },
  { count: 5,  reward: '₹5 Wallet Bonus',   icon: FiAward,      label: 'Bronze Tier',  desc: '5 friends ordered' },
  { count: 10, reward: '₹7 Wallet Bonus',   icon: FiTrendingUp, label: 'Silver Tier',  desc: '10 friends ordered' },
  { count: 25, reward: 'Snapit Plus VIP',   icon: FiShield,     label: 'Gold Legend',  desc: 'Top community ambassador' },
]

export default function ReferAndEarn() {
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [activeTab, setActiveTab] = useState('share') // 'share' | 'history'
  const [claimingMilestone, setClaimingMilestone] = useState(null)

  const fetchReferralInfo = async () => {
    try {
      const res = await Axios({ ...SummaryApi.getReferralInfo })
      if (res.data?.success) {
        setInfo(res.data.data)
      }
    } catch (err) {
      console.error('[ReferAndEarn] fetch error:', err)
      toast.error('Failed to load referral details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReferralInfo()
  }, [])

  const handleClaimMilestone = async (count) => {
    if (claimingMilestone || count === 1) return
    try { haptic.selection() } catch {}
    setClaimingMilestone(count)
    try {
      const res = await Axios({
        url: SummaryApi.claimReferralMilestone?.url || '/api/referral/claim-milestone',
        method: SummaryApi.claimReferralMilestone?.method || 'post',
        data: { milestone: count }
      })
      if (res.data?.success) {
        try { haptic.success() } catch {}
        toast.success(res.data.message || 'Milestone reward unlocked!')
        fetchReferralInfo()
      } else {
        toast.error(res.data?.message || 'Failed to claim milestone')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to claim milestone')
    } finally {
      setClaimingMilestone(null)
    }
  }

  const handleCopyCode = () => {
    if (!info?.referralCode) return toast.error('Log in to view your referral code')
    try { haptic.selection() } catch {}
    navigator.clipboard?.writeText?.(info.referralCode)
    setCopiedCode(true)
    toast.success('Referral code copied!')
    setTimeout(() => setCopiedCode(false), 2200)
  }

  const handleCopyLink = () => {
    if (!info?.referralLink) return toast.error('Log in to view your referral link')
    try { haptic.selection() } catch {}
    navigator.clipboard?.writeText?.(info.referralLink)
    setCopiedLink(true)
    toast.success('Invite link copied!')
    setTimeout(() => setCopiedLink(false), 2200)
  }

  const handleShare = async () => {
    if (!info?.referralCode) return toast.error('Log in to share your referral link')
    try { haptic.medium() } catch {}

    const shareData = {
      title: 'Order on Snapit & Get 50 Coins (₹1) Cash!',
      text: `Join me on Snapit! Get fresh groceries & food delivered in 10 minutes. Use my referral code: ${info.referralCode} to get 50 Snapit Coins (₹1) welcome cash on your 1st order! (50 coins = ₹1)`,
      url: info.referralLink
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        if (err.name !== 'AbortError') handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const handleWhatsAppShare = () => {
    if (!info?.referralCode) return toast.error('Log in to share your referral link')
    try { haptic.medium() } catch {}
    const msg = `Hey! Order fresh groceries & food on Snapit (10-Min Fast Delivery in Paliganj)!\n\nSign up with my invite code: *${info.referralCode}* and get 50 Snapit Coins (₹1) welcome cash credited on your 1st order! (50 coins = ₹1)\n\nJoin here: ${info.referralLink}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const referralCount = Number(info?.referralCount || 0)
  const totalEarned   = Number(info?.totalEarned || 0)
  // 50 coins = ₹1.00 Value
  const coinsEarned   = totalEarned * 50
  const friends       = info?.referredFriends || []
  const claimedMilestones = info?.claimedReferralMilestones || []
  const nextMilestone = useMemo(() => MILESTONES.find(m => m.count > referralCount), [referralCount])
  const toNext        = nextMilestone ? nextMilestone.count - referralCount : 0

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 dark:bg-slate-950 p-4 flex flex-col items-center justify-center space-y-4'>
        <div className='w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400'>
          <FiGift size={24} className='animate-pulse' />
        </div>
        <p className='text-xs font-bold text-slate-500 uppercase tracking-wider animate-pulse'>
          Loading Referral Hub…
        </p>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-20'>
      
      {/* ── STICKY TOP HEADER ── */}
      <header className='sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 shadow-xs'>
        <div className='max-w-2xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => navigate(-1)}
              className='w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 transition active:scale-95'
            >
              <IoArrowBack size={18} />
            </button>
            <div>
              <h1 className='text-base font-black text-slate-900 dark:text-white leading-tight'>
                Refer &amp; Earn
              </h1>
              <p className='text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider'>
                Snapit Community
              </p>
            </div>
          </div>

          <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60'>
            <FaWallet size={12} className='text-emerald-600 dark:text-emerald-400' />
            <span className='text-xs font-black text-emerald-700 dark:text-emerald-300'>
              ₹{totalEarned} Earned
            </span>
          </div>
        </div>
      </header>

      <main className='max-w-2xl mx-auto px-4 py-5 space-y-4'>

        {/* ── HERO BANNER CARD ── */}
        <div className='relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 text-white p-6 shadow-xl shadow-emerald-700/20'>
          
          {/* Subtle Ambient Decorative Glow */}
          <div className='absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none' />
          <div className='absolute -left-8 -bottom-8 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none' />

          <div className='relative z-10 flex flex-col items-center text-center space-y-3'>
            <div className='w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-100 shadow-inner'>
              <FiGift size={26} />
            </div>

            <div className='space-y-1 max-w-md'>
              <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-bold uppercase tracking-wider text-emerald-100'>
                <IoSparkles className='text-amber-300' />
                <span>Invite Friends &amp; Get 50 Coins (₹1)</span>
              </div>
              <h2 className='text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight pt-1'>
                Share Snapit, Earn Cash!
              </h2>
              <p className='text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed'>
                Give your friends fast 10-minute deliveries. Both of you receive <strong className='text-white'>50 Snapit Coins (₹1 instant cash)</strong> in your wallet on their 1st qualifying order (min ₹149).
              </p>
              <p className='text-[11px] text-emerald-200/90 font-semibold'>
                Exchange Rate: 50 Snapit Coins = ₹1.00 Value
              </p>
            </div>

            {/* Live Stats Row */}
            <div className='grid grid-cols-3 gap-2.5 w-full pt-2'>
              <div className='bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center'>
                <p className='text-xl sm:text-2xl font-black text-white leading-none'>{referralCount}</p>
                <p className='text-[10px] font-bold text-emerald-100 uppercase tracking-wider mt-1.5'>Friends Joined</p>
              </div>
              <div className='bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center'>
                <p className='text-xl sm:text-2xl font-black text-amber-300 leading-none'>₹{totalEarned}</p>
                <p className='text-[10px] font-bold text-emerald-100 uppercase tracking-wider mt-1.5'>Cash Earned</p>
              </div>
              <div className='bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center'>
                <p className='text-xl sm:text-2xl font-black text-white leading-none flex items-center justify-center gap-1'>
                  <FaCoins size={14} className='text-amber-300' />
                  <span>{coinsEarned}</span>
                </p>
                <p className='text-[10px] font-bold text-emerald-100 uppercase tracking-wider mt-1.5'>Coins Value</p>
              </div>
            </div>

            {/* Milestone Unlock Indicator */}
            {nextMilestone && (
              <div className='w-full mt-2 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] font-bold text-emerald-100'>
                <span className='flex items-center gap-1.5 truncate'>
                  <FiAward size={14} className='text-amber-300 shrink-0' />
                  <span>Invite <strong>{toNext} more</strong> to reach <strong>{nextMilestone.label} ({nextMilestone.reward})</strong></span>
                </span>
                <span className='px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-black text-[10px] shrink-0'>
                  {referralCount}/{nextMilestone.count}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── REFERRAL CODE & 1-TAP SHARING BOX ── */}
        <div className='bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <FiGift size={16} className='text-emerald-500' />
              <p className='text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400'>
                Your Unique Invite Code
              </p>
            </div>
            <span className='text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60'>
              Active &amp; Verified
            </span>
          </div>

          {/* Coupon Cutout Box */}
          <div className='relative rounded-2xl bg-emerald-50/60 dark:bg-slate-950 border-2 border-dashed border-emerald-500/50 p-4 flex items-center justify-between gap-3'>
            <div className='min-w-0'>
              <span className='text-[10px] text-slate-400 uppercase tracking-widest font-bold block'>
                Tap to copy code
              </span>
              <span className='font-mono font-black text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400 tracking-wider truncate block'>
                {info?.referralCode || 'SNAPIT50'}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 shadow-sm shrink-0 ${
                copiedCode
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:text-white'
              }`}
            >
              {copiedCode ? <FaCheck size={12} /> : <FiCopy size={13} />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* 1-Tap Viral Sharing Buttons */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1'>
            <button
              onClick={handleWhatsAppShare}
              className='w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2'
            >
              <FaWhatsapp size={17} className='text-white' />
              <span>Share on WhatsApp</span>
            </button>

            <button
              onClick={handleShare}
              className='w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-white font-bold text-sm transition flex items-center justify-center gap-2 border border-slate-700/50 shadow-sm'
            >
              <IoShareSocialOutline size={17} />
              <span>{copiedLink ? 'Link Copied ✓' : 'Share Invite Link'}</span>
            </button>
          </div>
        </div>

        {/* ── 3-STEP "HOW IT WORKS" FLOW ── */}
        <div className='bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='font-black text-sm text-slate-900 dark:text-white flex items-center gap-2'>
              <FiTrendingUp size={16} className='text-emerald-500' />
              <span>How It Works</span>
            </h3>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>
              3 Easy Steps
            </span>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            <div className='bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2'>
              <div className='w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black shrink-0'>
                01
              </div>
              <div>
                <h4 className='font-bold text-xs text-slate-900 dark:text-white'>Share Your Code</h4>
                <p className='text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed'>
                  Send your unique code or invite link to friends &amp; family.
                </p>
              </div>
            </div>

            <div className='bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2'>
              <div className='w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-black shrink-0'>
                02
              </div>
              <div>
                <h4 className='font-bold text-xs text-slate-900 dark:text-white'>Friend Places Order</h4>
                <p className='text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed'>
                  They register and complete their 1st qualifying order of ₹149+.
                </p>
              </div>
            </div>

            <div className='bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2'>
              <div className='w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black shrink-0'>
                03
              </div>
              <div>
                <h4 className='font-bold text-xs text-slate-900 dark:text-white'>Both Get ₹1 Cash</h4>
                <p className='text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed'>
                  Instant ₹1 cash (50 coins) credited to both wallets (50 coins = ₹1).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB SELECTOR: MILESTONES VS REFERRED FRIENDS ── */}
        <div className='flex gap-2 bg-slate-200/70 dark:bg-slate-900 rounded-2xl p-1 border border-slate-200/80 dark:border-slate-800'>
          <button
            onClick={() => { haptic.selection(); setActiveTab('share') }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
              activeTab === 'share'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FiAward size={14} />
            <span>Milestones &amp; Tiers</span>
          </button>

          <button
            onClick={() => { haptic.selection(); setActiveTab('history') }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FiUsers size={14} />
            <span>Referred Friends ({friends.length})</span>
          </button>
        </div>

        {/* ── TAB 1: MILESTONES SHOWCASE ── */}
        {activeTab === 'share' && (
          <div className='bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-black text-sm text-slate-900 dark:text-white'>Ambassador Tiers</h3>
                <p className='text-[11px] text-slate-500 font-medium'>Unlock extra perks as your invited network grows</p>
              </div>
              <span className='text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60'>
                VIP Rewards
              </span>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {MILESTONES.map(m => {
                const isAchieved = referralCount >= m.count
                const IconComp = m.icon
                return (
                  <div
                    key={m.count}
                    className={`rounded-2xl p-4 border transition-all ${
                      isAchieved
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800 opacity-80'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2.5'>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isAchieved
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <IconComp size={16} />
                        </div>
                        <div>
                          <h4 className='font-bold text-xs text-slate-900 dark:text-white'>
                            {m.label} · {m.count} Friend{m.count > 1 ? 's' : ''}
                          </h4>
                          <p className='text-[10px] text-slate-500 dark:text-slate-400 font-medium'>
                            {m.desc}
                          </p>
                        </div>
                      </div>

                      {isAchieved ? (
                        m.count === 1 ? (
                          <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white'>
                            Auto-Credited ✓
                          </span>
                        ) : claimedMilestones.includes(m.count) ? (
                          <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white'>
                            Claimed ✓
                          </span>
                        ) : (
                          <button
                            type='button'
                            onClick={() => handleClaimMilestone(m.count)}
                            disabled={claimingMilestone === m.count}
                            className='text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 transition active:scale-95 shadow-xs cursor-pointer'
                          >
                            {claimingMilestone === m.count ? 'Claiming…' : '🎁 Claim Perk'}
                          </button>
                        )
                      ) : (
                        <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'>
                          {Math.max(0, m.count - referralCount)} left
                        </span>
                      )}
                    </div>

                    <div className='mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-bold'>
                      <span className='text-slate-500 dark:text-slate-400'>Reward</span>
                      <span className='text-emerald-600 dark:text-emerald-400 font-black'>{m.reward}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TAB 2: REFERRED FRIENDS LIST ── */}
        {activeTab === 'history' && (
          <div className='bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-black text-sm text-slate-900 dark:text-white'>Invited Friends</h3>
                <p className='text-[11px] text-slate-500 font-medium'>Track friends who signed up with your code</p>
              </div>
              <span className='text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full'>
                {friends.length} Total
              </span>
            </div>

            {friends.length === 0 ? (
              <div className='py-12 text-center space-y-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6'>
                <div className='w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 text-xl flex items-center justify-center mx-auto'>
                  <FiUsers size={22} />
                </div>
                <div>
                  <h4 className='font-bold text-sm text-slate-900 dark:text-white'>No Referrals Yet</h4>
                  <p className='text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1'>
                    Share your invite code with friends, neighbors, and campus buddies to start collecting wallet cash!
                  </p>
                </div>
                <button
                  onClick={handleWhatsAppShare}
                  className='px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition'
                >
                  Invite on WhatsApp
                </button>
              </div>
            ) : (
              <div className='divide-y divide-slate-100 dark:divide-slate-800'>
                {friends.map((f, idx) => (
                  <div key={f.id || idx} className='py-3 flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-3 min-w-0'>
                      <div className='w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0 uppercase'>
                        {f.name ? f.name.charAt(0) : 'F'}
                      </div>
                      <div className='min-w-0'>
                        <h4 className='font-bold text-xs text-slate-900 dark:text-white truncate'>
                          {f.name}
                        </h4>
                        <p className='text-[10px] text-slate-400 font-medium'>
                          Joined {f.joinedAt ? new Date(f.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                        </p>
                      </div>
                    </div>

                    <div className='text-right shrink-0'>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        f.hasOrdered
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {f.hasOrdered ? (
                          <>
                            <FiCheckCircle size={10} />
                            <span>₹1 Credited</span>
                          </>
                        ) : (
                          <>
                            <FiClock size={10} />
                            <span>Order Pending</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TRANSPARENT TERMS & CONDITIONS ── */}
        <div className='bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5'>
          <p className='font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5'>
            <IoInformationCircleOutline size={14} />
            <span>Referral Program Terms</span>
          </p>
          <ul className='list-disc pl-4 space-y-1'>
            <li>Cash reward is credited when your referred friend places their first successful order of ₹149 or more.</li>
            <li>₹1 wallet cash (50 Snapit Coins) is credited directly to both users' wallets. (Exchange rate: 50 Snapit Coins = ₹1).</li>
            <li>Self-referrals and duplicate device accounts are automatically detected and blocked to protect store integrity.</li>
          </ul>
        </div>

      </main>
    </div>
  )
}