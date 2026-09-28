import React, { useState, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { setUserDetails } from '../store/userSlice'
import Axios from '../utils/Axios'
import { toast } from 'react-hot-toast'
import { IoArrowBack, IoCheckmarkCircle, IoInformationCircleOutline } from 'react-icons/io5'
import { FaCrown, FaCheck, FaWallet, FaShieldAlt } from 'react-icons/fa'
import { FiTruck, FiZap, FiPercent, FiGift, FiAward, FiChevronDown, FiAlertCircle } from 'react-icons/fi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { haptic } from '../utils/haptics'
import { getSnapitPaymentLogo } from '../utils/snapitBadge'

const BENEFITS = [
  {
    icon: <FiTruck className='text-emerald-500' size={20} />,
    title: 'FREE Delivery on ₹99+',
    desc: 'No delivery fee on all daily groceries above ₹99. Saves ₹20-35 on every order.',
    badge: 'Save ₹300+/mo'
  },
  {
    icon: <FiPercent className='text-amber-500' size={20} />,
    title: '2% Instant Wallet Cashback',
    desc: '2% auto-credited back to your Snapit Wallet after every delivered grocery order (up to ₹25/order).',
    badge: 'Auto-credited'
  },
  {
    icon: <FiZap className='text-blue-500' size={20} />,
    title: 'Priority Rush Packing',
    desc: 'Your grocery orders jump straight to the front of the dark store packing line.',
    badge: 'Fast-track'
  },
  {
    icon: <FiAward className='text-purple-500' size={20} />,
    title: '24/7 VIP Concierge Support',
    desc: 'Instant priority routing to our senior live support team whenever you need help.',
    badge: 'Zero wait'
  },
  {
    icon: <FiGift className='text-rose-500' size={20} />,
    title: 'Weekly Surprise Product Box',
    desc: 'Free premium grocery sample packed inside one of your weekly deliveries.',
    badge: 'Worth ₹100+'
  },
  {
    icon: <FaCrown className='text-yellow-500' size={18} />,
    title: '₹25 Birthday Bonus Credit',
    desc: 'A complimentary ₹25 free wallet gift credited automatically during your birthday month.',
    badge: 'Annual gift'
  }
]

const FAQS = [
  {
    q: 'How does the free delivery benefit work?',
    a: 'Whenever your grocery cart total is ₹99 or more, the delivery fee is automatically set to ₹0 at checkout without needing any coupon code.'
  },
  {
    q: 'Can I pay for Snapit Plus using my Snapit Wallet balance?',
    a: 'Yes! If you have sufficient balance in your Snapit Wallet, you can activate your VIP membership instantly with 1 tap.'
  },
  {
    q: 'Can I cancel my membership anytime?',
    a: 'Yes, you can easily cancel your membership anytime from the My Subscriptions page or from this membership tab.'
  },
  {
    q: 'How is the 2% cashback calculated and credited?',
    a: '2% cashback is calculated on the grocery item subtotal (up to ₹25 per order, max ₹150/month) and credited directly to your Snapit Wallet upon successful delivery.'
  }
]

// Dynamically load Razorpay SDK if not present in window
const loadRazorpaySDK = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function SnapitPlus({ isAlreadyMember = false, onSuccess }) {
  const user = useSelector((state) => state.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [plan, setPlan] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [payingWithWallet, setPayingWithWallet] = useState(false)
  const [orderFreq, setOrderFreq] = useState(12) // Default 12 orders/month for ROI
  const [openFaq, setOpenFaq] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Determine real membership status from Redux state or props
  const isMember = useMemo(() => {
    if (isAlreadyMember) return true
    return Boolean(
      user?.isSnapitPlusMember &&
      (!user?.snapitPlusExpiresAt || new Date(user?.snapitPlusExpiresAt) > new Date())
    )
  }, [user?.isSnapitPlusMember, user?.snapitPlusExpiresAt, isAlreadyMember])

  const planPrice = plan === 'monthly' ? 99 : 899
  const monthlyEquivalent = plan === 'yearly' ? 75 : 99
  const walletBalance = Number(user?.walletBalance || 0)
  const canPayWithWallet = walletBalance >= planPrice

  // Calculate dynamic ROI savings
  const deliveryPerOrder = 25
  const withoutPlus = orderFreq * deliveryPerOrder
  const monthlyCost = plan === 'yearly' ? 75 : 99
  const monthlySavings = withoutPlus - monthlyCost

  // Remaining days for active members
  const daysLeft = user?.snapitPlusExpiresAt
    ? Math.max(0, Math.ceil((new Date(user.snapitPlusExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // 1-Tap Wallet Payment
  const handleWalletPayment = async () => {
    if (!user?._id) {
      toast.error('Please login to activate Snapit Plus')
      navigate('/login?redirect=/snapit-plus')
      return
    }

    haptic.medium()
    setPayingWithWallet(true)
    try {
      const res = await Axios({
        url: '/api/payment/subscribe-wallet',
        method: 'post',
        data: { planType: plan }
      })

      if (res.data?.success) {
        toast.success(res.data.message || 'Welcome to Snapit Plus Club! 🎉')
        haptic.success()
        // Refresh user profile
        try {
          const userRes = await Axios({ url: '/api/user/user-details', method: 'get' })
          if (userRes.data?.success) dispatch(setUserDetails(userRes.data.data))
        } catch (_) {}
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.data?.message || 'Wallet payment failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate with wallet')
    } finally {
      setPayingWithWallet(false)
    }
  }

  // Razorpay Gateway Checkout
  const handleCheckoutPayment = async () => {
    if (!user?._id) {
      toast.error('Please login to activate Snapit Plus')
      navigate('/login?redirect=/snapit-plus')
      return
    }

    haptic.medium()
    setLoading(true)

    try {
      const isLoaded = await loadRazorpaySDK()
      if (!isLoaded) {
        throw new Error('Unable to connect to payment gateway. Please check your internet connection.')
      }

      const keyRes = await Axios({ url: '/api/payment/razorpay-key', method: 'get' })
      if (!keyRes.data?.success || !keyRes.data?.key) {
        throw new Error('Could not acquire payment gateway keys.')
      }

      const orderRes = await Axios({
        url: '/api/payment/subscribe-snapitplus',
        method: 'post',
        data: { planType: plan }
      })

      if (!orderRes.data?.success || !orderRes.data?.order) {
        throw new Error(orderRes.data?.message || 'Order creation failed.')
      }

      const { id: razorpay_order_id, amount, currency } = orderRes.data.order

      const options = {
        key: keyRes.data.key,
        amount,
        currency: currency || 'INR',
        name: 'Snapit Plus VIP',
        description: `Premium Grocery Access Pass — ${plan === 'yearly' ? '12 Months' : '30 Days'}`,
        image: getSnapitPaymentLogo(),
        order_id: razorpay_order_id,
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.mobile ? String(user.mobile).slice(-10) : ''
        },
        handler: async function (response) {
          try {
            const verifyRes = await Axios({
              url: '/api/payment/verify-subscription',
              method: 'post',
              data: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planType: plan
              }
            })

            if (verifyRes.data?.success) {
              toast.success('Welcome to Snapit Plus Club! 🎉')
              haptic.success()
              try {
                const userRes = await Axios({ url: '/api/user/user-details', method: 'get' })
                if (userRes.data?.success) dispatch(setUserDetails(userRes.data.data))
              } catch (_) {}
              if (onSuccess) onSuccess()
            } else {
              toast.error(verifyRes.data?.message || 'Verification failed')
            }
          } catch (verifyErr) {
            toast.error('Payment verification failed. Please contact support.')
          }
        },
        theme: { color: '#059669' },
        modal: {
          ondismiss: () => {
            document.body.style.overflow = ''
            document.body.style.touchAction = ''
          }
        }
      }

      const gatewaySheet = new window.Razorpay(options)
      gatewaySheet.open()

    } catch (err) {
      console.error('Subscription gateway error:', err)
      toast.error(err.message || 'Failed to launch subscription gateway.')
    } finally {
      setLoading(false)
    }
  }

  // Cancel Membership Handler
  const handleCancelMembership = async () => {
    try { haptic.heavy() } catch {}
    setIsCancelling(true)
    try {
      // Find sub ID or cancel directly
      const subRes = await Axios({ url: '/api/subscription/my-subscriptions', method: 'get' })
      const plusSub = subRes.data?.data?.find(s => s.isSnapitPlus && s.status === 'Active')

      const payload = { id: plusSub?._id || 'snapit_plus_synced', isSnapitPlus: true }
      const targetUrl = plusSub?._id ? `/api/subscription/cancel/${plusSub._id}` : '/api/subscription/cancel'

      try {
        await Axios({
          method: 'DELETE',
          url: targetUrl,
          data: payload
        })
      } catch {
        await Axios({
          method: 'POST',
          url: targetUrl,
          data: payload
        })
      }

      // Update user details
      const userRes = await Axios({ url: '/api/user/user-details', method: 'get' })
      if (userRes.data?.success) dispatch(setUserDetails(userRes.data.data))

      toast.success('Snapit Plus membership cancelled')
      setShowCancelModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel membership')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-xs'>
        <div className='max-w-2xl mx-auto flex items-center justify-between'>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1)
              else navigate('/')
            }}
            className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform'
            aria-label='Back'
          >
            <IoArrowBack size={18} />
          </button>

          <div className='text-center'>
            <h1 className='text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5'>
              <FaCrown className='text-amber-500 text-sm' />
              <span>Snapit Plus VIP</span>
            </h1>
            <p className='text-[11px] text-slate-400 font-medium'>
              {isMember ? 'VIP Member Privileges Unlocked' : 'Premium Grocery Membership'}
            </p>
          </div>

          <Link
            to='/subscriptions'
            className='text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-1'
          >
            My Subs
          </Link>
        </div>
      </div>

      <div className='max-w-2xl mx-auto px-4 pt-4 space-y-4'>
        {/* VIP Hero Banner */}
        <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white p-6 shadow-xl border border-emerald-500/20'>
          <div className='absolute -right-8 -top-8 w-40 h-40 bg-amber-400/15 rounded-full blur-2xl pointer-events-none' />
          <div className='absolute -left-8 -bottom-8 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none' />

          <div className='relative z-10 text-center space-y-2.5'>
            <div className='w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/30'>
              <FaCrown />
            </div>

            <h2 className='text-2xl sm:text-3xl font-black tracking-tight text-white'>
              Snapit Plus
            </h2>

            <p className='text-xs sm:text-sm text-emerald-100/90 font-medium max-w-sm mx-auto'>
              The ultimate pass for daily grocery shoppers. Enjoy unlimited free deliveries and 2% cashbacks.
            </p>

            <div className='pt-1'>
              {isMember ? (
                <div className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-md'>
                  <span className='w-2 h-2 rounded-full bg-slate-950 animate-pulse' />
                  <span>👑 ACTIVE VIP MEMBER</span>
                  {daysLeft !== null && <span>• {daysLeft} Days Left</span>}
                </div>
              ) : (
                <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold'>
                  <span>⚡ Instant Activation • Cancel Anytime</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Member Status Card (when active) */}
        {isMember && (
          <div className='bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-300 dark:border-amber-700/60 shadow-xs flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0'>
                <IoCheckmarkCircle />
              </div>
              <div>
                <h4 className='font-bold text-sm text-slate-900 dark:text-white'>
                  VIP Pass is Active
                </h4>
                <p className='text-xs text-slate-500 dark:text-slate-400'>
                  {user?.snapitPlusExpiresAt ? (
                    <>Valid until {new Date(user.snapitPlusExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                  ) : (
                    'Active Ongoing Plan'
                  )}
                </p>
              </div>
            </div>

            <button
              type='button'
              onClick={() => setShowCancelModal(true)}
              className='text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 transition-colors'
            >
              Cancel VIP
            </button>
          </div>
        )}

        {/* Plan Selection Section (Executive VIP Grade) */}
        {!isMember && (
          <div className='space-y-3.5'>
            <div className='flex items-center justify-between'>
              <h3 className='font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5'>
                <FaCrown className='text-amber-500' size={14} />
                <span>Select Membership Plan</span>
              </h3>
              <span className='text-[11px] font-bold text-slate-400'>
                Instant 1-tap activation
              </span>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
              {/* Monthly Plan Card */}
              <div
                role='button'
                tabIndex={0}
                onClick={() => {
                  try { haptic.selection() } catch {}
                  setPlan('monthly')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setPlan('monthly')
                  }
                }}
                className={`relative rounded-2xl p-4 sm:p-5 text-left border-2 cursor-pointer transition-all duration-200 select-none ${
                  plan === 'monthly'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <span className='inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-1.5'>
                      Monthly Flexibility
                    </span>
                    <h4 className='text-sm font-black text-slate-900 dark:text-white leading-tight'>
                      Monthly VIP
                    </h4>
                  </div>

                  {/* Radio Indicator */}
                  <div className='shrink-0 mt-0.5'>
                    {plan === 'monthly' ? (
                      <IoCheckmarkCircle className='text-emerald-600 dark:text-emerald-400 text-2xl drop-shadow-xs' />
                    ) : (
                      <div className='w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900' />
                    )}
                  </div>
                </div>

                <div className='flex items-baseline gap-1 mt-2.5'>
                  <span className='text-3xl font-black text-slate-900 dark:text-white tracking-tight'>
                    ₹99
                  </span>
                  <span className='text-xs font-bold text-slate-400'>
                    / 30 days
                  </span>
                </div>

                <div className='mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold'>
                  <span className='text-emerald-600 dark:text-emerald-400'>
                    ✓ Unlimited ₹0 deliveries
                  </span>
                  <span className='text-slate-400'>
                    Billed monthly
                  </span>
                </div>
              </div>

              {/* Annual Plan Card (Recommended) */}
              <div
                role='button'
                tabIndex={0}
                onClick={() => {
                  try { haptic.selection() } catch {}
                  setPlan('yearly')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setPlan('yearly')
                  }
                }}
                className={`relative rounded-2xl p-4 sm:p-5 text-left border-2 cursor-pointer transition-all duration-200 select-none ${
                  plan === 'yearly'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-gradient-to-br from-emerald-50/70 via-amber-50/30 to-emerald-50/60 dark:from-emerald-950/40 dark:via-amber-950/20 dark:to-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Floating Best Value Badge with pointer-events-none */}
                <div className='absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm pointer-events-none flex items-center gap-1'>
                  <FaCrown size={9} />
                  <span>SAVE 25% • BEST VALUE</span>
                </div>

                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <span className='inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 mb-1.5 border border-amber-300 dark:border-amber-800/60'>
                      Full Year Pass
                    </span>
                    <h4 className='text-sm font-black text-slate-900 dark:text-white leading-tight'>
                      Annual VIP
                    </h4>
                  </div>

                  {/* Radio Indicator */}
                  <div className='shrink-0 mt-0.5'>
                    {plan === 'yearly' ? (
                      <IoCheckmarkCircle className='text-emerald-600 dark:text-emerald-400 text-2xl drop-shadow-xs' />
                    ) : (
                      <div className='w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900' />
                    )}
                  </div>
                </div>

                <div className='flex items-baseline gap-1 mt-2.5'>
                  <span className='text-3xl font-black text-slate-900 dark:text-white tracking-tight'>
                    ₹899
                  </span>
                  <span className='text-xs font-bold text-slate-400'>
                    / 12 months
                  </span>
                  <span className='ml-2 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md'>
                    = ₹75/mo
                  </span>
                </div>

                <div className='mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold'>
                  <span className='text-amber-600 dark:text-amber-400'>
                    💰 Save ₹289 vs Monthly
                  </span>
                  <span className='text-slate-400'>
                    Full 365 Days
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic ROI Calculator */}
        {!isMember && (
          <div className='bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs'>
            <div className='flex items-center justify-between'>
              <h3 className='font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5'>
                <span>💡 See Your Monthly Savings</span>
              </h3>
              <span className='text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg'>
                {orderFreq} orders/mo
              </span>
            </div>

            {/* Range Slider for Order Frequency */}
            <div className='space-y-1.5'>
              <input
                type='range'
                min='4'
                max='30'
                step='2'
                value={orderFreq}
                onChange={(e) => setOrderFreq(Number(e.target.value))}
                className='w-full accent-emerald-600 cursor-pointer'
              />
              <div className='flex justify-between text-[10px] text-slate-400 font-medium'>
                <span>Occasional (4/mo)</span>
                <span>Regular (12/mo)</span>
                <span>Daily Shopper (30/mo)</span>
              </div>
            </div>

            {/* Savings Breakdown Table */}
            <div className='bg-slate-50 dark:bg-slate-850 rounded-xl p-3 space-y-2 text-xs'>
              <div className='flex justify-between text-slate-600 dark:text-slate-400'>
                <span>Standard delivery fees ({orderFreq} orders × ₹25)</span>
                <span className='line-through text-rose-500 font-semibold'>₹{withoutPlus}</span>
              </div>
              <div className='flex justify-between text-slate-600 dark:text-slate-400'>
                <span>
                  Snapit Plus membership ({plan === 'yearly' ? 'Annual VIP' : 'Monthly VIP'})
                </span>
                <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                  ₹{monthlyEquivalent}/mo {plan === 'yearly' && <span className='text-[10px] font-normal text-slate-400'>(₹899 billed yearly)</span>}
                </span>
              </div>
              <div className='pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold'>
                <span className='text-slate-900 dark:text-white'>Estimated Net Savings</span>
                <span className='text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400'>
                  {monthlySavings > 0 ? `+₹${monthlySavings}/month` : '₹0'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Grid */}
        <div className='bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs'>
          <div className='flex items-center justify-between'>
            <h3 className='font-black text-sm text-slate-900 dark:text-white'>
              Exclusive VIP Privileges
            </h3>
            <span className='text-[10px] uppercase font-bold text-slate-400'>
              All Unlocked
            </span>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {BENEFITS.map((b, i) => (
              <div
                key={i}
                className='flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800'
              >
                <div className='w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs'>
                  {b.icon}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center justify-between gap-1'>
                    <h4 className='text-xs font-bold text-slate-900 dark:text-white truncate'>
                      {b.title}
                    </h4>
                    <span className='text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded shrink-0'>
                      {b.badge}
                    </span>
                  </div>
                  <p className='text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug'>
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment CTA Section */}
        {!isMember ? (
          <div className='space-y-2.5 pt-2'>
            {/* 1-Tap Wallet Payment Button (if enough balance) */}
            {canPayWithWallet && (
              <button
                type='button'
                disabled={payingWithWallet || loading}
                onClick={handleWalletPayment}
                className='w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all'
              >
                <FaWallet size={15} />
                <span>
                  {payingWithWallet
                    ? 'Activating via Wallet...'
                    : `⚡ 1-Tap Pay ₹${planPrice} with Snapit Wallet (${plan === 'yearly' ? 'Annual' : 'Monthly'})`}
                </span>
                <span className='text-xs opacity-75 font-bold'>(Bal: ₹{walletBalance})</span>
              </button>
            )}

            {/* Standard Gateway Button (UPI / Card / NetBanking) */}
            <button
              type='button'
              disabled={loading || payingWithWallet}
              onClick={handleCheckoutPayment}
              className='w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all'
            >
              {loading ? (
                <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
              ) : (
                <>
                  <FaShieldAlt size={14} />
                  <span>
                    {plan === 'yearly'
                      ? 'Activate Annual VIP — ₹899 / Year (Save 25%)'
                      : 'Activate Monthly VIP — ₹99 / Month'}
                  </span>
                </>
              )}
            </button>

            <p className='text-center text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1'>
              <FaShieldAlt className='text-emerald-500' size={11} />
              <span>100% Secure Checkout via Razorpay • Cancel Anytime</span>
            </p>
          </div>
        ) : (
          <div className='p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-1'>
            <p className='text-xs font-bold text-emerald-700 dark:text-emerald-300'>
              You are enjoying all Snapit Plus VIP benefits on all orders!
            </p>
            <Link
              to='/grocery'
              className='inline-block text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline pt-1'
            >
              Start Shopping with Free Delivery →
            </Link>
          </div>
        )}

        {/* FAQs Section */}
        <div className='bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs'>
          <h3 className='font-bold text-sm text-slate-900 dark:text-white'>
            Frequently Asked Questions
          </h3>

          <div className='divide-y divide-slate-100 dark:divide-slate-800'>
            {FAQS.map((faq, i) => (
              <div key={i} className='py-2.5'>
                <button
                  type='button'
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className='w-full flex items-center justify-between text-left text-xs font-bold text-slate-800 dark:text-slate-200'
                >
                  <span>{faq.q}</span>
                  <FiChevronDown
                    className={`transition-transform duration-200 shrink-0 ml-2 ${
                      openFaq === i ? 'rotate-180 text-emerald-600' : 'text-slate-400'
                    }`}
                    size={14}
                  />
                </button>
                {openFaq === i && (
                  <p className='text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed'>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for VIP Cancellation */}
      {showCancelModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150'>
          <div className='bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4'>
            <div className='w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-2xl'>
              <FiAlertCircle />
            </div>

            <div className='text-center space-y-1.5'>
              <h3 className='font-black text-slate-900 dark:text-white text-base'>
                Cancel Snapit Plus VIP?
              </h3>
              <p className='text-xs text-slate-500 dark:text-slate-400 leading-relaxed'>
                Are you sure you want to cancel? You will immediately lose free delivery on orders ₹99+, 2% grocery cashback, and VIP priority pack benefits.
              </p>
            </div>

            <div className='grid grid-cols-2 gap-2.5 pt-2'>
              <button
                type='button'
                onClick={() => setShowCancelModal(false)}
                className='px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors'
              >
                Keep VIP
              </button>
              <button
                type='button'
                disabled={isCancelling}
                onClick={handleCancelMembership}
                className='px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all flex items-center justify-center'
              >
                {isCancelling ? (
                  <span className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                ) : (
                  'Yes, Cancel VIP'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}